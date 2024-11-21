const express = require('express');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

const cors = require('cors');
app.use(cors());

app.use(express.json());

// Inicializar o servidor
if (process.env.NODE_ENV !== 'test') {
  app.listen(3000, () => {
    console.log('Servidor rodando em http://localhost:3000');
  });
}
/* API para criar uma Classe (Tabela) */
app.post('/create_class', async (req, res) => {
  console.log('Requisição recebida:', req.body);
  const { identificador, atributos } = req.body;

  try {
    const classe = await prisma.classe.create({
      data: { identificador, atributos },
    });
    res.status(201).json(classe);
  } catch (error) {
    console.error('Erro ao criar classe:', error.message);
    res.status(400).json({ error: error.message });
  }
});

/* API para criar um Ativo (Registro em tabela) */
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

/* API para criar um vínculo */
app.post('/create_vinculo', async (req, res) => {
  const { origemId, destinoId, tipo } = req.body;

  // Validação inicial
  if (!origemId || !destinoId || !tipo) {
    return res.status(400).json({ error: 'Por favor, forneça origemId, destinoId e tipo.' });
  }

  try {
    // Valida se o ativo de origem existe
    const origem = await prisma.ativo.findUnique({
      where: { identificador: origemId },
    });

    if (!origem) {
      return res.status(404).json({ error: 'Ativo de origem não encontrado.' });
    }

    // Valida se o ativo de destino existe
    const destino = await prisma.ativo.findUnique({
      where: { identificador: destinoId },
    });

    if (!destino) {
      return res.status(404).json({ error: 'Ativo de destino não encontrado.' });
    }

    // Cria o vínculo
    const vinculo = await prisma.vinculo.create({
      data: {
        origemId,
        destinoId,
        tipo,
      },
    });

    res.status(201).json(vinculo); // Retorna o vínculo criado
  } catch (error) {
    res.status(400).json({ error: error.message }); // Retorna o erro, se houver
  }
});



/* API para excluir uma Classe (Deleta todos os ativos e vinculos associados) */
app.delete('/delete_class/:identificador', async (req, res) => {
  const { identificador } = req.params;

  // Validação inicial
  if (!identificador) {
    return res.status(400).json({ error: 'O identificador da classe é obrigatório.' });
  }

  try {
    // Verifica se a Classe existe
    const classe = await prisma.classe.findUnique({
      where: { identificador },
    });

    if (!classe) {
      return res.status(404).json({ error: 'Classe não encontrada.' });
    }

    // Busca os Ativos associados à Classe
    const ativosAssociados = await prisma.ativo.findMany({
      where: { classeId: identificador },
    });

    // Exclui os vínculos relacionados aos Ativos associados
    const ativosIds = ativosAssociados.map((ativo) => ativo.identificador);
    await prisma.vinculo.deleteMany({
      where: {
        OR: [
          { origemId: { in: ativosIds } },
          { destinoId: { in: ativosIds } },
        ],
      },
    });

    // Exclui os Ativos associados à Classe
    await prisma.ativo.deleteMany({
      where: { classeId: identificador },
    });

    // Exclui a Classe
    await prisma.classe.delete({
      where: { identificador },
    });

    res.status(200).json({
      message: `Classe '${identificador}', seus ativos associados e vínculos relacionados foram excluídos com sucesso.`,
    });
  } catch (error) {
    res.status(400).json({ error: error.message }); // Retorna o erro, se houver
  }
});

/* API para excluir um Ativo (Deleta os vinculos associados) */
app.delete('/delete_ativo/:identificador', async (req, res) => {
  const { identificador } = req.params;

  // Validação inicial
  if (!identificador) {
    return res.status(400).json({ error: 'O identificador do ativo é obrigatório.' });
  }

  try {
    // Verifica se o ativo existe
    const ativo = await prisma.ativo.findUnique({
      where: { identificador },
    });

    if (!ativo) {
      return res.status(404).json({ error: 'Ativo não encontrado.' });
    }

    // Exclui os vínculos relacionados ao Ativo
    await prisma.vinculo.deleteMany({
      where: {
        OR: [
          { origemId: identificador },
          { destinoId: identificador },
        ],
      },
    });

    // Exclui o Ativo
    await prisma.ativo.delete({
      where: { identificador },
    });

    res.status(200).json({ message: `Ativo '${identificador}' e seus vínculos associados foram excluídos com sucesso.` });
  } catch (error) {
    res.status(400).json({ error: error.message }); // Retorna o erro, se houver
  }
});

/* API para excluir um relacionamento (Vinculo) */
app.delete('/delete_vinculos', async (req, res) => {
  const { origemId, destinoId, tipo } = req.body;

  // Validação inicial: pelo menos um critério deve ser informado
  if (!origemId && !destinoId && !tipo) {
    return res.status(400).json({ error: 'Informe ao menos um dos critérios: origemId, destinoId ou tipo.' });
  }

  try {
    // Constrói os critérios de busca dinamicamente
    const whereClause = {};
    if (origemId) whereClause.origemId = origemId;
    if (destinoId) whereClause.destinoId = destinoId;
    if (tipo) whereClause.tipo = tipo;

    // Verifica se existem vínculos correspondentes
    const vinculosExistentes = await prisma.vinculo.findMany({
      where: whereClause,
    });

    if (vinculosExistentes.length === 0) {
      return res.status(404).json({ error: 'Nenhum vínculo encontrado com os critérios fornecidos.' });
    }

    // Exclui os vínculos correspondentes
    await prisma.vinculo.deleteMany({
      where: whereClause,
    });

    res.status(200).json({
      message: `${vinculosExistentes.length} vínculo(s) excluído(s) com sucesso.`,
    });
  } catch (error) {
    res.status(400).json({ error: error.message }); // Retorna o erro, se houver
  }
});

/* Consultar todas as Classes */ 
app.get('/get_class', async (req, res) => {
  try {
    const classes = await prisma.classe.findMany();
    res.status(200).json(classes);
  } catch (error) {
    res.status(400).json({ error: error.message }); // Retorna o erro, se houver
  }
});

/* Consulta todos os ativos de uma Classe */
app.get('/get_class/:identificador', async (req, res) => {
  const { identificador } = req.params;

  // Validação inicial
  if (!identificador) {
    return res.status(400).json({ error: 'O identificador da classe é obrigatório.' });
  }

  try {
    // Verifica se a Classe existe
    const classe = await prisma.classe.findUnique({
      where: { identificador },
    });

    if (!classe) {
      return res.status(404).json({ error: 'Classe não encontrada.' });
    }

    // Busca os Ativos associados à Classe
    const ativos = await prisma.ativo.findMany({
      where: { classeId: identificador },
    });

    if (ativos.length === 0) {
      return res.status(404).json({ error: 'Nenhum ativo encontrado para esta classe.' });
    }

    // Retorna os Ativos encontrados
    res.status(200).json(ativos);
  } catch (error) {
    res.status(400).json({ error: error.message }); // Retorna o erro, se houver
  }
});

/* Consulta todos os atributos de uma classe */
app.get('/get_class_attributes/:identificador', async (req, res) => {
  const { identificador } = req.params;

  // Validação inicial
  if (!identificador) {
    return res.status(400).json({ error: 'O identificador da classe é obrigatório.' });
  }

  try {
    // Busca a Classe pelo identificador
    const classe = await prisma.classe.findUnique({
      where: { identificador },
    });

    if (!classe) {
      return res.status(404).json({ error: 'Classe não encontrada.' });
    }

    // Retorna os atributos da Classe
    res.status(200).json(classe.atributos);
  } catch (error) {
    res.status(400).json({ error: error.message }); // Retorna o erro, se houver
  }
});

/* Consulta todos os vinculos de um ativo */
app.get('/get_vinculos/:identificador', async (req, res) => {
  const { identificador } = req.params;

  // Validação inicial
  if (!identificador) {
    return res.status(400).json({ error: 'O identificador do ativo é obrigatório.' });
  }

  try {
    // Verifica se o ativo existe
    const ativo = await prisma.ativo.findUnique({
      where: { identificador },
    });

    if (!ativo) {
      return res.status(404).json({ error: 'Ativo não encontrado.' });
    }

    // Busca todos os vínculos relacionados ao ativo
    const vinculos = await prisma.vinculo.findMany({
      where: {
        OR: [
          { origemId: identificador },
          { destinoId: identificador },
        ],
      },
    });

    if (vinculos.length === 0) {
      return res.status(404).json({ error: 'Nenhum vínculo encontrado para este ativo.' });
    }

    // Retorna os vínculos encontrados
    res.status(200).json(vinculos);
  } catch (error) {
    res.status(400).json({ error: error.message }); // Retorna o erro, se houver
  }
});

/* API para atualizar os atributos de um Ativo */
app.put('/update_ativo', async (req, res) => {
  const { identificador, atributos } = req.body;

  // Validação inicial
  if (!identificador) {
    return res.status(400).json({ error: 'O identificador do ativo é obrigatório.' });
  }
  if (!atributos || typeof atributos !== 'object') {
    return res.status(400).json({ error: 'Os atributos devem ser fornecidos no formato de objeto.' });
  }

  try {
    // Verifica se o ativo existe
    const ativo = await prisma.ativo.findUnique({
      where: { identificador },
    });

    if (!ativo) {
      return res.status(404).json({ error: 'Ativo não encontrado.' });
    }

    // Atualiza os atributos do ativo
    const updatedAtivo = await prisma.ativo.update({
      where: { identificador },
      data: { atributos },
    });

    res.status(200).json({
      message: `Ativo '${identificador}' atualizado com sucesso.`,
      ativo: updatedAtivo,
    });
  } catch (error) {
    res.status(500).json({ error: `Erro ao atualizar o ativo: ${error.message}` });
  }
});

module.exports = app; // Exporta o app para os testes