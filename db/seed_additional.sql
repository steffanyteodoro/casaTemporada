insert into modelos_mensagem (nome, gatilho, referencia, offset_dias, hora_envio, eh_template, texto_template)
select 'Lembrete pré-estadia (1 dia antes)', 'antes_checkin', 'checkin', -1, '10:00', false,
 'Excelente dia {nome}! 😃

Aqui é a Sté, sua anfitriã em Olímpia!
Sua estadia na Sté House já está chegando e quero garantir que vocês tenham todas as informações para um check-in tranquilo:

📅 Check-in: {checkin} – a partir das 14h
📅 Check-out: {checkout} – até às 13h
📍 Endereço: Rua Maria Thereza Dutra Neves, 69 - Jardim Botânico - Olimpia/SP - 15400-642

📶 Wi-Fi:
Rede: STÉ HOUSE
Senha: STEhouse123

🛌 Enxoval e Limpeza:
* Atenção: Não fornecemos enxoval (roupas de cama, fronhas, toalhas de banho e cobertas). Por favor, não esqueçam de trazer os seus.
* Cozinha e Limpeza: Disponibilizamos como cortesia panos de prato e panos de limpeza.

⚡ Informações importantes:
* Voltagem da casa: 110V. Algumas tomadas são 220V (identificadas com cor vermelha). Tenha cuidado ao conectar aparelhos.

🛎️ Instruções para o Check-in:
* O portão é aberto remotamente. Ao chegar, me envie mensagem que liberarei sua entrada.

📜 Regras da casa:
* Check-out até às 13h: Evitar atrasos, pois a limpeza é feita logo após sua saída.
* Proibido som alto.
* Não são permitidas visitas extras ou inclusão de hóspedes sem autorização prévia.
* Qualquer dano à casa será cobrado conforme necessidade.

Se precisar de algo antes da chegada, estou por aqui para ajudar!

Desejo uma ótima viagem e que venham com Deus 🙏💙
Até breve!
Abraços,
Sté 🥰'
where not exists (
  select 1 from modelos_mensagem where nome = 'Lembrete pré-estadia (1 dia antes)'
);
