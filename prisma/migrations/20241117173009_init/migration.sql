-- CreateTable
CREATE TABLE "Classe" (
    "id" SERIAL NOT NULL,
    "identificador" TEXT NOT NULL,
    "atributos" JSONB NOT NULL,

    CONSTRAINT "Classe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ativo" (
    "id" SERIAL NOT NULL,
    "classeId" TEXT NOT NULL,
    "identificador" TEXT NOT NULL,
    "atributos" JSONB NOT NULL,

    CONSTRAINT "Ativo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vinculo" (
    "id" SERIAL NOT NULL,
    "origemId" TEXT NOT NULL,
    "destinoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,

    CONSTRAINT "Vinculo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Classe_identificador_key" ON "Classe"("identificador");

-- CreateIndex
CREATE UNIQUE INDEX "Ativo_identificador_key" ON "Ativo"("identificador");
