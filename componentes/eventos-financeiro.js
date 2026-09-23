// ==========================================
// eventos-financeiro.js — Dashboard financeiro do evento
// ==========================================

// Função para atualizar os cards do Dashboard Financeiro
window.atualizarDashboardFinanceiro = async function (eventoId) {
  try {
    // Busca os detalhes do evento para saber o valor da mesa e capacidade
    const { data: evento } = await _supabase
      .from("eventos")
      .select("quantidade_mesas, valor_mesa")
      .eq("id", eventoId)
      .single();
      
    if (!evento) return;

    const valorMesa = parseFloat(evento.valor_mesa) || 0;
    const capacidade = parseInt(evento.quantidade_mesas) || 0;

    let mesasOcupadas = 0;
    let receitaGarantida = 0;
    let receitaPendente = 0;
    let valorCortesias = 0; // <-- Nova caixinha

    // Percorre as reservas na memória para calcular
    window.listaReservasLocal.forEach((res) => {
      // Conta quantas mesas tem nessa reserva (se for "10, 11", conta como 2)
      let qtdMesas = 0;
      if (Array.isArray(res.mesas)) {
          qtdMesas = res.mesas.length;
      } else if (res.mesas) {
          qtdMesas = String(res.mesas).split(",").filter(m => m.trim() !== "").length;
      }

      // Verifica se é cortesia pelo Tipo (select) OU se você digitou a palavra no Nome
      const nomeCliente = String(res.cliente_nome || "").toUpperCase();
      const isCortesia = res.tipo === "CORTESIA" || res.tipo === "BLOQUEIO" || nomeCliente.includes("CORTESIA") || nomeCliente.includes("BLOQUEIO");

      if (isCortesia) {
          // Joga o valor (mesmo que pendente) na caixa de Cortesias
          valorCortesias += qtdMesas * valorMesa;
          
          // Conta na ocupação se estiver confirmada
          if (res.status === "confirmada") {
              mesasOcupadas += qtdMesas;
          }
      } else {
          // Vendas reais
          if (res.status === "confirmada") {
            mesasOcupadas += qtdMesas;
            receitaGarantida += qtdMesas * valorMesa;
          } else if (res.status === "pendente") {
            receitaPendente += qtdMesas * valorMesa;
          }
      }
    });

    // Função rápida para formatar em Reais (R$)
    const formatarDinheiro = (valor) => {
        return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    };

    // Injeta os valores na tela
    const elCapacidade = document.getElementById("dash-capacidade");
    if (elCapacidade) elCapacidade.innerText = `${mesasOcupadas} / ${capacidade}`;
    
    const elReceita = document.getElementById("dash-receita");
    if (elReceita) elReceita.innerText = formatarDinheiro(receitaGarantida);
    
    const elPendente = document.getElementById("dash-pendente");
    if (elPendente) elPendente.innerText = formatarDinheiro(receitaPendente);
    
    // Injeta o valor na NOVA caixinha Azul
    const elCortesia = document.getElementById("dash-cortesia");
    if (elCortesia) elCortesia.innerText = formatarDinheiro(valorCortesias);

  } catch (err) {
    console.error("Erro ao gerar dashboard:", err);
  }
};
