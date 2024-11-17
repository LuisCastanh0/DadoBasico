require('dotenv').config(); // Carrega variáveis do .env
const express = require('express');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

app.use(express.json()); // Suporte para JSON no body das requisições

// Inicializar o servidor
app.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});

app.post('/create_class', async (req, res) => {
  const { identificador, atributos } = req.body;

  try {
    const classe = await prisma.classe.create({
      data: {
        identificador,
        atributos,
      },
    });
    res.status(201).json(classe); // Retorna a classe criada
  } catch (error) {
    res.status(400).json({ error: error.message }); // Retorna o erro, se houver
  }
});

app.post('/create_ativo', async (req, res) => {
  const { classeId, identificador, atributos } = req.body;

  // Validação inicial
  if (!classeId || !identificador || !atributos) {
    return res.status(400).json({ error: 'Por favor, forneça classeId, identificador e atributos.' });
  }

  try {
    // Valida se a Classe existe
    const classe = await prisma.classe.findUnique({
      where: { identificador: classeId },
    });

    if (!classe) {
      return res.status(404).json({ error: 'Classe não encontrada.' });
    }

    // Cria o Ativo
    const ativo = await prisma.ativo.create({
      data: {
        classeId,
        identificador,
        atributos,
      },
    });

    res.status(201).json(ativo); // Retorna o Ativo criado
  } catch (error) {
    res.status(400).json({ error: error.message }); // Retorna o erro, se houver
  }
});