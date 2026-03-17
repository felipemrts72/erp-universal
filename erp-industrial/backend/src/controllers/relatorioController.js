import { relatorioService } from '../services/relatorioService.js';

export const relatorioController = {
  async create(req, res) {
    const fotoUrl = req.files?.foto?.[0] ? `/uploads/${req.files.foto[0].filename}` : req.body.fotoUrl;
    const assinaturaUrl = req.files?.assinatura?.[0]
      ? `/uploads/${req.files.assinatura[0].filename}`
      : req.body.assinaturaUrl;

    const result = await relatorioService.create({
      ordemProducaoId: Number(req.body.ordemProducaoId),
      nomeFuncionario: req.body.nomeFuncionario,
      descricao: req.body.descricao,
      fotoUrl,
      assinaturaUrl
    });
    res.status(201).json(result);
  },
  async list(req, res) {
    const result = await relatorioService.list();
    res.json(result);
  }
};
