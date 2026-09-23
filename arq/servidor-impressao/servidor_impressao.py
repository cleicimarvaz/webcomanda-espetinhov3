import tkinter as tk
from tkinter import messagebox
import json
import os
import sys
import threading
import socket
import unicodedata
import ctypes
import re
import textwrap
import winreg
from datetime import datetime, timedelta
from supabase import create_client
from escpos.printer import Network

# --- CONFIGURAÇÕES E PASTAS DO WINDOWS ---
pasta_appdata = os.path.join(os.getenv('LOCALAPPDATA'), 'WebComanda')
if not os.path.exists(pasta_appdata):
    os.makedirs(pasta_appdata)

ARQUIVO_CONFIG = os.path.join(pasta_appdata, 'config_impressora.json')
ARQUIVO_LOTES_IMPRESSOS = os.path.join(pasta_appdata, 'lotes_impressos.json')

historico_dados = [] 
evento_recarregar = threading.Event()

def obter_caminho_executavel():
    if getattr(sys, 'frozen', False):
        return sys.executable
    return os.path.abspath(__file__)

def carregar_configuracao():
    if os.path.exists(ARQUIVO_CONFIG):
        with open(ARQUIVO_CONFIG, 'r') as f:
            return json.load(f)
    return {
        "ip_impressora": "",
        "supabase_url": "",
        "supabase_key": "",
        "tabela": "comandas",
        "intervalo_busca": "60"
    }

def salvar_configuracao():
    config = {
        "ip_impressora": entry_ip.get().strip(),
        "supabase_url": entry_url.get().strip(),
        "supabase_key": entry_key.get().strip(),
        "tabela": entry_tabela.get().strip(),
        "intervalo_busca": entry_intervalo.get().strip()
    }
    try:
        with open(ARQUIVO_CONFIG, 'w') as f:
            json.dump(config, f)
            
        evento_recarregar.set()
        messagebox.showinfo("Sucesso", "Configurações salvas e aplicadas!\n\nO sistema já está monitorando com os novos dados.")
    except Exception as e:
        messagebox.showerror("Erro", f"Falha ao salvar:\n{e}")

# --- CONTROLE DE LOTES ---
_lock_lotes = threading.Lock()

def carregar_lotes_impressos():
    if os.path.exists(ARQUIVO_LOTES_IMPRESSOS):
        try:
            with open(ARQUIVO_LOTES_IMPRESSOS, 'r') as f:
                return set(json.load(f))
        except Exception:
            return set()
    return set()

lotes_impressos = carregar_lotes_impressos()

def marcar_lote_impresso(chave_lote):
    lotes_impressos.add(chave_lote)
    try:
        with open(ARQUIVO_LOTES_IMPRESSOS, 'w') as f:
            json.dump(list(lotes_impressos), f)
    except Exception:
        pass

# --- FUNÇÕES DE REDE E UTILITÁRIOS ---
def testar_conexao_ip(ip, porta=9100):
    socket_teste = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    socket_teste.settimeout(4) 
    try:
        return socket_teste.connect_ex((ip, porta)) == 0
    except:
        return False
    finally:
        socket_teste.close()

def exibir_alerta_erro(mensagem):
    ctypes.windll.user32.MessageBoxW(0, mensagem, "Alerta - WebComanda", 0x10 | 0x40000)

def limpar_texto(texto):
    if not texto: return ""
    texto = str(texto).replace('•', '-').replace('▪', '-')
    return re.sub(r'[^\x20-\x7E\xA0-\xFF]', '', texto).strip()

def converter_hora_brasilia(hora_utc_string):
    try:
        if 'T' in hora_utc_string:
            tempo_utc = datetime.strptime(hora_utc_string[:19], "%Y-%m-%dT%H:%M:%S")
            tempo_local = tempo_utc - timedelta(hours=3)
            return tempo_local.strftime("%H:%M:%S")
        return hora_utc_string
    except:
        return hora_utc_string

# --- REGRAS DE NEGÓCIO ---
def item_e_cozinha(item):
    if not item: return False
    categoria = str(item.get('categoria') or '').lower()
    nome_bruto = str(item.get('nome') or '').upper()
    nome = ''.join(c for c in unicodedata.normalize('NFD', nome_bruto) if unicodedata.category(c) != 'Mn')

    if item.get('precisa_preparo') is False: return False
    categorias_bebida = ('bebida', 'cerveja', 'refrigerante', 'agua', 'água', 'suco')
    if any(c in categoria for c in categorias_bebida): return False
    nomes_bebida = ('PGTO', 'AGUA', 'REFRIGERANTE', 'CERVEJA', 'SUCO', 'COCA', 'GUARANA', 'PEPSI', 'HEINEKEN')
    if any(n in nome for n in nomes_bebida): return False

    return True

def item_esta_pendente(item):
    status = item.get('cozinha_status')
    return not status or status == 'novo'

def agrupar_itens_em_lotes(comanda):
    itens = comanda.get('itens') or []
    lotes = {}
    for item in itens:
        if not item_e_cozinha(item) or item.get('cozinha_status') == 'pronto':
            continue
        chave_tempo = item.get('hora_pedido') or item.get('hora') or comanda.get('created_at')
        if chave_tempo not in lotes:
            lotes[chave_tempo] = []
        lotes[chave_tempo].append(item)
    return lotes

# --- FUNÇÃO DE IMPRESSÃO ---
def imprimir_lote(comanda, hora_pedido, itens_do_lote, is_reimpressao=False):
    identificacao = comanda.get('identificacao', 'MESA N/A')
    ip_impressora = carregar_configuracao().get("ip_impressora")
    
    if not ip_impressora:
        exibir_alerta_erro("IP da impressora não configurado.")
        return False

    if not testar_conexao_ip(ip_impressora):
        exibir_alerta_erro(f"Atenção! A impressora no IP {ip_impressora} está DESLIGADA ou SEM REDE.")
        return False

    try:
        impressora = Network(ip_impressora, port=9100)

        if is_reimpressao:
            impressora.set(align='center', bold=True)
            impressora.text("*** REIMPRESSAO ***\n\n")

        impressora.set(align='center', bold=True)
        impressora.text("PEDIDO COZINHA\n")
        impressora.set(align='center', bold=True, width=2, height=2)
        impressora.text(f"{identificacao}\n")

        data_hora_atual = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        impressora.set(align='center', bold=False, width=1, height=1)
        impressora.text(f"{data_hora_atual}\n")
        impressora.text("-" * 48 + "\n\n") # Ajustado para 48 traços na impressora de 80mm

        for item in itens_do_lote:
            qtd = item.get('qtd', 1)
            nome = limpar_texto(item.get('nome', '')).upper()
            
            impressora.set(align='left', bold=True)
            
            # NOVO: Quebra o nome do item mantendo palavras inteiras e alinhando
            linhas_nome = textwrap.wrap(f"{qtd}x {nome}", width=48, subsequent_indent="   ")
            for linha in linhas_nome:
                impressora.text(f"{linha}\n")

            obs = item.get('observacao') or item.get('detalhes')
            if obs:
                impressora.set(align='left', bold=False)
                obs = limpar_texto(obs).replace('<br>', '|')
                partes = [parte.strip() for parte in obs.split('|') if parte.strip()]
                for parte in partes:
                    # NOVO: Quebra as observações mantendo palavras inteiras e dando recuo visual
                    linhas_obs = textwrap.wrap(f"-> {parte}", width=48, initial_indent="  ", subsequent_indent="     ")
                    for linha in linhas_obs:
                        impressora.text(f"{linha}\n")
            impressora.text("\n")

        impressora.set(align='center', bold=False)
        impressora.text("-" * 48 + "\n") # Ajustado para 48 traços
        impressora.text("*** FIM DO PEDIDO ***\n\n\n\n\n")
        
        impressora.cut()
        impressora.close() 
        return True

    except Exception as e:
        exibir_alerta_erro(f"Falha técnica ao tentar imprimir:\n{e}")
        return False

def adicionar_ao_historico_ui(comanda, hora_pedido, itens):
    identificacao = comanda.get('identificacao', 'N/A')
    hora_local = converter_hora_brasilia(hora_pedido)
    hora_impressao = datetime.now().strftime('%H:%M:%S')
    
    texto_exibicao = f"[{hora_impressao}] MESA: {identificacao} (Pedido: {hora_local})"
    
    def atualizar():
        historico_dados.append((comanda, hora_pedido, itens))
        listbox_historico.insert(tk.END, texto_exibicao)
        
        # NOVO: Se o histórico passar de 100 itens, remove o mais antigo.
        # Isso impede o aplicativo de travar ou consumir muita memória RAM ao longo dos dias.
        if len(historico_dados) > 100:
            historico_dados.pop(0)
            listbox_historico.delete(0)
            
        listbox_historico.yview(tk.END)
    
    app.after(0, atualizar)

def processar_comanda(comanda):
    itens = comanda.get('itens')
    if not itens: return

    if isinstance(itens, str):
        try:
            import json
            comanda['itens'] = json.loads(itens)
        except: return

    lotes = agrupar_itens_em_lotes(comanda)
    
    with _lock_lotes:
        for hora_pedido, itens_do_lote in lotes.items():
            chave_lote = f"{comanda.get('id')}_{hora_pedido}"
            
            if chave_lote in lotes_impressos:
                continue
            
            if not any(item_esta_pendente(item) for item in itens_do_lote):
                marcar_lote_impresso(chave_lote)
                continue
            
            sucesso = imprimir_lote(comanda, hora_pedido, itens_do_lote)
            if sucesso:
                marcar_lote_impresso(chave_lote)
                adicionar_ao_historico_ui(comanda, hora_pedido, itens_do_lote)

# --- MOTOR DE BUSCA (SMART POLLING) ---
def atualizar_status_ui(mensagem, cor):
    app.after(0, lambda: label_status.config(text=mensagem, fg=cor))

def loop_escuta_banco():
    cliente_supabase = None
    url_atual = ""
    key_atual = ""
    
    while True:
        config = carregar_configuracao()
        url = config.get("supabase_url")
        key = config.get("supabase_key")
        tabela = config.get("tabela") or "comandas"
        
        try:
            intervalo = int(config.get("intervalo_busca", 60))
            if intervalo < 1: intervalo = 1
        except ValueError:
            intervalo = 60

        if not url or not key:
            atualizar_status_ui("Faltam configurações do banco de dados.", "red")
            evento_recarregar.wait(5)
            evento_recarregar.clear()
            continue

        try:
            if not cliente_supabase or url != url_atual or key != key_atual:
                cliente_supabase = create_client(url, key)
                url_atual = url
                key_atual = key

            resposta = cliente_supabase.table(tabela).select("*").order("id", desc=True).limit(10).execute()
            
            if resposta.data:
                for comanda in reversed(resposta.data):
                    processar_comanda(comanda)
                    
            atualizar_status_ui(f"🟢 Monitorando... (Busca a cada {intervalo}s)", "#00A651")
            
        except Exception:
            atualizar_status_ui(f"🔴 Erro de rede. Tentando reconectar...", "red")
        
        evento_recarregar.wait(intervalo)
        evento_recarregar.clear()

# --- FUNÇÕES DA INTERFACE ---
def testar_impressao_interface():
    ip = entry_ip.get().strip()
    if not ip: return messagebox.showwarning("Aviso", "Insira o IP da impressora.")
    if not testar_conexao_ip(ip): return messagebox.showerror("Erro", "Impressora não encontrada.")
    try:
        impressora = Network(ip, port=9100)
        impressora.set(align='center', bold=True)
        impressora.text("TESTE OK!\n\n\n\n")
        impressora.cut()
        impressora.close()
        messagebox.showinfo("Sucesso", "Ticket impresso!")
    except Exception as e:
        messagebox.showerror("Erro", str(e))

def testar_banco_interface():
    url, key, tabela = entry_url.get().strip(), entry_key.get().strip(), entry_tabela.get().strip()
    if not url or not key: return messagebox.showwarning("Aviso", "Preencha as chaves.")
    try:
        cliente_teste = create_client(url, key)
        cliente_teste.table(tabela).select("*").limit(1).execute()
        messagebox.showinfo("Sucesso", f"Conexão com a tabela '{tabela}' estabelecida!")
    except Exception as e:
        messagebox.showerror("Erro", str(e))

def reimprimir_selecionado():
    selecao = listbox_historico.curselection()
    if not selecao:
        messagebox.showwarning("Aviso", "Selecione um pedido na lista de histórico para reimprimir.")
        return
    
    index = selecao[0]
    comanda, hora_pedido, itens = historico_dados[index]
    
    sucesso = imprimir_lote(comanda, hora_pedido, itens, is_reimpressao=True)
    if sucesso:
        messagebox.showinfo("Sucesso", "O pedido foi reenviado para a impressora!")

def visualizar_selecionado():
    selecao = listbox_historico.curselection()
    if not selecao:
        messagebox.showwarning("Aviso", "Selecione um pedido na lista para visualizar.")
        return

    index = selecao[0]
    comanda, hora_pedido, itens = historico_dados[index]

    identificacao = comanda.get('identificacao', 'N/A')
    hora_formatada = converter_hora_brasilia(hora_pedido)

    texto_recibo = "PEDIDO COZINHA\n"
    texto_recibo += f"{identificacao}\n"
    texto_recibo += f"Hora Lançamento: {hora_formatada}\n"
    texto_recibo += "-" * 48 + "\n\n" # Ajustado para 48 traços

    for item in itens:
        qtd = item.get('qtd', 1)
        nome = limpar_texto(item.get('nome', '')).upper()
        
        # Quebra inteligente para a visualização na tela também
        linhas_nome = textwrap.wrap(f"{qtd}x {nome}", width=48, subsequent_indent="   ")
        for linha in linhas_nome:
            texto_recibo += f"{linha}\n"
        
        obs = item.get('observacao') or item.get('detalhes')
        if obs:
            obs = limpar_texto(obs).replace('<br>', '|')
            partes = [parte.strip() for parte in obs.split('|') if parte.strip()]
            for parte in partes:
                linhas_obs = textwrap.wrap(f"-> {parte}", width=48, initial_indent="  ", subsequent_indent="     ")
                for linha in linhas_obs:
                    texto_recibo += f"{linha}\n"
        texto_recibo += "\n"

    texto_recibo += "-" * 48 + "\n"
    texto_recibo += "*** FIM DO PEDIDO ***\n"

    janela_view = tk.Toplevel(app)
    janela_view.title("Visualizar Ticket")
    janela_view.geometry("380x500") 
    janela_view.attributes("-topmost", True)

    text_widget = tk.Text(janela_view, font=("Courier", 10), padx=15, pady=15, bg="#f9f9f9")
    text_widget.pack(fill=tk.BOTH, expand=True)
    text_widget.insert(tk.END, texto_recibo)
    text_widget.config(state=tk.DISABLED) 

    def acao_imprimir_view():
        sucesso = imprimir_lote(comanda, hora_pedido, itens, is_reimpressao=True)
        if sucesso:
            messagebox.showinfo("Sucesso", "O pedido foi reenviado para a impressora!", parent=janela_view)
            janela_view.destroy() 

    frame_botoes_view = tk.Frame(janela_view, bg="#e0e0e0")
    frame_botoes_view.pack(fill=tk.X, side=tk.BOTTOM)

    btn_imprimir = tk.Button(frame_botoes_view, text="🖨️ Imprimir Este Ticket", command=acao_imprimir_view, bg="#FF8C00", fg="white", font=("Arial", 10, "bold"), pady=5)
    btn_imprimir.pack(fill=tk.X, padx=20, pady=10)

# --- AUTO INICIAR COM O WINDOWS ---
def adicionar_ao_iniciar_windows():
    try:
        caminho_exe = obter_caminho_executavel()
        
        # Abre a chave do Registro do Windows responsável por iniciar programas
        chave_registro = winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            r"Software\Microsoft\Windows\CurrentVersion\Run",
            0,
            winreg.KEY_SET_VALUE
        )
        
        # Cria a regra para o WebComanda (as aspas garantem que caminhos com espaço funcionem)
        winreg.SetValueEx(chave_registro, "WebComandaImpressao", 0, winreg.REG_SZ, f'"{caminho_exe}"')
        winreg.CloseKey(chave_registro)
        
        messagebox.showinfo("Sucesso", "Configurado perfeitamente! O sistema iniciará automaticamente com o Windows.")
    except Exception as e:
        messagebox.showerror("Erro", f"Falha ao configurar a inicialização no Windows:\n{e}")

def iniciar_interface():
    global app, entry_ip, entry_url, entry_key, entry_tabela, entry_intervalo, label_status, listbox_historico

    app = tk.Tk()
    app.title("WebComanda - Motor de Impressão")
    app.geometry("540x630") 

    config_atual = carregar_configuracao()

    def criar_campo(texto, valor_padrao, ocultar=False):
        tk.Label(app, text=texto, font=("Arial", 9, "bold"), fg="#333333").pack(pady=(5, 0))
        entry = tk.Entry(app, width=50, font=("Arial", 10))
        if ocultar: entry.config(show="*")
        entry.insert(0, valor_padrao)
        entry.pack(pady=(0, 2))
        return entry

    entry_ip = criar_campo("Endereço IP da Impressora de Rede:", config_atual.get("ip_impressora", ""))
    
    # --- NOVO: MÁSCARA INTELIGENTE DE IP ---
    def auto_formatar_ip(event):
        # Ignora teclas de apagar e setas para não atrapalhar a edição
        if event.keysym in ('BackSpace', 'Delete', 'Left', 'Right'):
            return
            
        texto = entry_ip.get()
        # Filtra deixando apenas números e pontos
        novo_texto = ''.join([c for c in texto if c.isdigit() or c == '.'])
        
        partes = novo_texto.split('.')
        partes = partes[:4] # Trava em no máximo 4 blocos
        
        resultado = ""
        for i, parte in enumerate(partes):
            parte = parte[:3] # Trava cada bloco em no máximo 3 números
            resultado += parte
            
            # Põe o ponto automático se o bloco encher, ou preserva o ponto manual
            if len(parte) == 3 and i < 3:
                resultado += "."
            elif i < len(partes) - 1:
                resultado += "."
                
        # Atualiza o campo instantaneamente
        if resultado != texto:
            entry_ip.delete(0, tk.END)
            entry_ip.insert(0, resultado)

    entry_ip.bind('<KeyRelease>', auto_formatar_ip)
    # ---------------------------------------

    entry_url = criar_campo("URL do Supabase (Project URL):", config_atual.get("supabase_url", ""))
    entry_key = criar_campo("Chave do Supabase (Service Role Key):", config_atual.get("supabase_key", ""), ocultar=True)
    entry_tabela = criar_campo("Tabela de Comandas:", config_atual.get("tabela", "comandas"))
    entry_intervalo = criar_campo("Intervalo de Busca (em segundos):", config_atual.get("intervalo_busca", "60"))

    frame_botoes = tk.Frame(app)
    frame_botoes.pack(pady=8)

    tk.Button(frame_botoes, text="Testar Impressora", command=testar_impressao_interface, bg="#003366", fg="white", font=("Arial", 9, "bold"), width=16).grid(row=0, column=0, padx=5)
    tk.Button(frame_botoes, text="Testar Banco", command=testar_banco_interface, bg="#333333", fg="white", font=("Arial", 9, "bold"), width=16).grid(row=0, column=1, padx=5)
    tk.Button(frame_botoes, text="Salvar Dados", command=salvar_configuracao, bg="#00A651", fg="white", font=("Arial", 9, "bold"), width=16).grid(row=0, column=2, padx=5)
    
    tk.Button(app, text="Iniciar com o Windows", command=adicionar_ao_iniciar_windows, bg="#333333", fg="white", font=("Arial", 9), width=30).pack(pady=(0, 5))

    # --- PAINEL DE HISTÓRICO ---
    tk.Label(app, text="📋 Histórico de Pedidos Impressos (Sessão Atual):", font=("Arial", 10, "bold"), fg="#003366").pack(pady=(10, 0))
    
    frame_lista = tk.Frame(app)
    frame_lista.pack(padx=20, pady=5, fill=tk.BOTH, expand=True)
    
    scrollbar = tk.Scrollbar(frame_lista)
    scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
    
    listbox_historico = tk.Listbox(frame_lista, yscrollcommand=scrollbar.set, font=("Arial", 10), height=6)
    listbox_historico.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
    scrollbar.config(command=listbox_historico.yview)

    frame_acoes = tk.Frame(app)
    frame_acoes.pack(pady=5)
    
    tk.Button(frame_acoes, text="👀 Visualizar Ticket", command=visualizar_selecionado, bg="#2196F3", fg="white", font=("Arial", 9, "bold")).grid(row=0, column=0, padx=10)
    tk.Button(frame_acoes, text="🖨️ Reimprimir", command=reimprimir_selecionado, bg="#FF8C00", fg="white", font=("Arial", 9, "bold")).grid(row=0, column=1, padx=10)

    label_status = tk.Label(app, text="Iniciando sistema...", font=("Arial", 9, "bold"))
    label_status.pack(side="bottom", pady=5)

    # --- NOVO: ENCERRAMENTO TOTAL E LIMPO ---
    # Garante que o aplicativo feche 100% ao clicar no 'X', matando conexões presas
    def fechar_aplicativo():
        app.destroy()
        sys.exit(0)

    app.protocol("WM_DELETE_WINDOW", fechar_aplicativo)
    # ----------------------------------------

    app.mainloop()

if __name__ == "__main__":
    thread_banco = threading.Thread(target=loop_escuta_banco, daemon=True)
    thread_banco.start()
    iniciar_interface()