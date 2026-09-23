import os
import sys
import shutil
import subprocess
import escpos

print("--- INICIANDO COMPILADOR INFALÍVEL ---")

# 1. Descobre onde a biblioteca escpos está instalada
pasta_escpos = os.path.dirname(escpos.__file__)
json_original = os.path.join(pasta_escpos, 'capabilities.json')

if not os.path.exists(json_original):
    print(f"ERRO CRÍTICO: Não encontrei o arquivo em {json_original}")
    sys.exit(1)

print(f"1. Arquivo original encontrado em: {json_original}")

# 2. Copia o arquivo fisicamente para a pasta do seu projeto
json_copia = os.path.join(os.getcwd(), 'capabilities.json')
shutil.copy(json_original, json_copia)
print("2. Arquivo 'capabilities.json' copiado para a pasta local com sucesso!")

# 3. Diz ao PyInstaller para pegar essa cópia local e jogar dentro da pasta 'escpos' do .exe
comando = [
    sys.executable, "-m", "PyInstaller",
    "--noconsole",
    "--onefile",
    "--add-data", "capabilities.json;escpos",
    "servidor_impressao.py"
]

print("3. Executando o PyInstaller... (isso pode levar alguns segundos)\n")
subprocess.run(comando)

print("\n--- COMPILAÇÃO CONCLUÍDA! ---")
print("Pode verificar a pasta 'dist'. O executável agora está completo.")