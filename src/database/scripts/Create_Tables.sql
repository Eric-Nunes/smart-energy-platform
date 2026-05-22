CREATE DATABASE TCCMonitoramentoEnergetico;
GO

USE TCCMonitoramentoEnergetico;
GO

CREATE TABLE tb_usuarios (
    id INT PRIMARY KEY IDENTITY(1,1),
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    data_cadastro DATETIME DEFAULT GETDATE()
);

CREATE TABLE tb_dispositivos (
    id INT PRIMARY KEY IDENTITY(1,1),
    nome_dispositivo VARCHAR(100) NOT NULL,
    localizacao VARCHAR(100),
    data_cadastro DATETIME DEFAULT GETDATE(),

    usuario_id INT NOT NULL,

    CONSTRAINT FK_Dispositivos_Usuarios
    FOREIGN KEY (usuario_id)
    REFERENCES tb_usuarios(id)
);

CREATE TABLE tb_medicoes (
    id INT PRIMARY KEY IDENTITY(1,1),

    dispositivo_id INT NOT NULL,

    tensao DECIMAL(10,2),
    corrente DECIMAL(10,2),
    potencia DECIMAL(10,2),
    consumo_kwh DECIMAL(10,2),

    data_hora DATETIME DEFAULT GETDATE(),

    CONSTRAINT FK_Medicoes_Dispositivos
    FOREIGN KEY (dispositivo_id)
    REFERENCES tb_dispositivos(id)
);

CREATE TABLE tarifas_energia (
    id INT PRIMARY KEY IDENTITY(1,1),

    valor_kwh DECIMAL(10,2) NOT NULL,

    data_inicio DATETIME NOT NULL,
    data_fim DATETIME
);

select * from tb_medicoes;