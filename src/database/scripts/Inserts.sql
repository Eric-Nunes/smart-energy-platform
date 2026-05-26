INSERT INTO tb_usuarios (nome, email, senha, data_cadastro)
VALUES
(
    'Bruno Correa',
    'bruno@email.com',
    '123456',
    GETDATE()
);

INSERT INTO tb_dispositivos (nome_dispositivo, localizacao, data_cadastro, usuario_id)
VALUES
    ('Monitor Sala', 'Sala de Estar', GETDATE(), 1),
	('Ventilador', 'Quarto', GETDATE(), 1),
	('Geladeira', 'Cozinha', GETDATE(), 1);

INSERT INTO tarifas_energia (valor_kwh, data_inicio, data_fim)
VALUES
(
    0.92,
    '2026-05-01',
    '2026-05-31'
);

INSERT INTO tb_medicoes (dispositivo_id, tensao, corrente, potencia, consumo_kwh, data_hora)
VALUES
(1, 127.0, 5.3, 673.1, 1.82, GETDATE() );