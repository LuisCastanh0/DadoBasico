const request = require('supertest');
const app = require('../index'); // Certifique-se de exportar o app no index.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();


// Testes unitarios de cada API.
beforeEach(async () => {
  // Criar uma classe de teste antes de cada teste
  await prisma.classe.create({
    data: {
      identificador: 'Clientes',
      atributos: { nome: 'string', idade: 'int' },
    },
  });
});

afterEach(async () => {
  // Limpar todas as tabelas após cada teste
  await prisma.vinculo.deleteMany();
  await prisma.ativo.deleteMany();
  await prisma.classe.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect(); // Desconectar do Prisma após todos os testes
});

describe('Testes de Classes', () => {
  it('Deve criar uma nova classe', async () => {
    const response = await request(app).post('/create_class').send({
      identificador: 'Produtos',
      atributos: { descricao: 'string', preco: 'float' },
    });
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('identificador', 'Produtos');
  });

  it('Deve retornar todas as classes', async () => {
    const response = await request(app).get('/get_class');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('Deve excluir uma classe', async () => {
    const response = await request(app).delete('/delete_class/Clientes');
    expect(response.status).toBe(200);
    expect(response.body.message).toContain('Classe');
  });
});

describe('Testes de Ativos', () => {
  it('Deve criar um ativo na classe Clientes', async () => {
    const response = await request(app).post('/create_ativo').send({
      classeId: 'Clientes',
      identificador: 'Joao123',
      atributos: { nome: 'João', idade: 25 },
    });
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('identificador', 'Joao123');
  });

  it('Deve retornar todos os ativos de uma classe', async () => {
    // Criar um ativo para realizar o teste
    await prisma.ativo.create({
      data: {
        classeId: 'Clientes',
        identificador: 'Maria123',
        atributos: { nome: 'Maria', idade: 30 },
      },
    });

    const response = await request(app).get('/get_class/Clientes');
    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ identificador: 'Maria123' }),
      ])
    );
  });

  it('Deve excluir um ativo', async () => {
    // Criar um ativo para realizar o teste
    await prisma.ativo.create({
      data: {
        classeId: 'Clientes',
        identificador: 'Carlos456',
        atributos: { nome: 'Carlos', idade: 40 },
      },
    });

    const response = await request(app).delete('/delete_ativo/Carlos456');
    expect(response.status).toBe(200);
    expect(response.body.message).toContain('Ativo');
  });
});

describe('Testes de Vínculos', () => {
  beforeEach(async () => {
    // Criar ativos de origem e destino para os testes de vínculos
    await prisma.ativo.create({
      data: {
        classeId: 'Clientes',
        identificador: 'Ativo1',
        atributos: { nome: 'Origem' },
      },
    });

    await prisma.ativo.create({
      data: {
        classeId: 'Clientes',
        identificador: 'Ativo2',
        atributos: { nome: 'Destino' },
      },
    });
  });

  it('Deve criar um vínculo entre dois ativos', async () => {
    const response = await request(app).post('/create_vinculo').send({
      origemId: 'Ativo1',
      destinoId: 'Ativo2',
      tipo: 'Relacionado',
    });
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('tipo', 'Relacionado');
  });

  it('Deve retornar todos os vínculos de um ativo', async () => {
    // Criar um vínculo para realizar o teste
    await prisma.vinculo.create({
      data: {
        origemId: 'Ativo1',
        destinoId: 'Ativo2',
        tipo: 'Relacionado',
      },
    });

    const response = await request(app).get('/get_vinculos/Ativo1');
    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tipo: 'Relacionado' }),
      ])
    );
  });

  it('Deve excluir um vínculo', async () => {
    // Criar um vínculo para realizar o teste
    await prisma.vinculo.create({
      data: {
        origemId: 'Ativo1',
        destinoId: 'Ativo2',
        tipo: 'Relacionado',
      },
    });

    const response = await request(app).delete('/delete_vinculos').send({
      origemId: 'Ativo1',
      tipo: 'Relacionado',
    });
    expect(response.status).toBe(200);
    expect(response.body.message).toContain('vínculo(s)');
  });
});

// Testes de Erro
describe('Testes de Erro', () => {
  it('Deve retornar erro ao criar um ativo em uma classe inexistente', async () => {
    const response = await request(app).post('/create_ativo').send({
      classeId: 'Inexistente',
      identificador: 'Teste123',
      atributos: { nome: 'Teste' },
    });
    expect(response.status).toBe(404);
    expect(response.body.error).toContain('Classe não encontrada');
  });

  it('Deve retornar erro ao criar um vínculo entre dois ativos inexistentes', async () => {
    const response = await request(app).post('/create_vinculo').send({
      origemId: 'Inexistente1',
      destinoId: 'Inexistente2',
      tipo: 'Relacionado',
    });
    expect(response.status).toBe(404);
    expect(response.body.error).toContain('Ativo de origem não encontrado');
  });

  it('Deve retornar erro ao consultar vínculos de um ativo sem vínculos', async () => {
    await prisma.ativo.create({
      data: {
        classeId: 'Clientes',
        identificador: 'SemRelacionamento',
        atributos: { nome: 'SemRelacionamento' },
      },
    });

    const response = await request(app).get('/get_vinculos/SemRelacionamento');
    expect(response.status).toBe(404);
    expect(response.body.error).toContain('Nenhum vínculo encontrado para este ativo');
  });

  it('Deve retornar erro ao excluir vínculo com parâmetros inválidos', async () => {
    const response = await request(app).delete('/delete_vinculos').send({
      origemId: '',
      tipo: '',
    });
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Informe ao menos um dos critérios');
  });
});
