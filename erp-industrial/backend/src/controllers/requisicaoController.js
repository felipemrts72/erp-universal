import { requisicaoService } from '../services/requisicaoService.js';

export const requisicaoController = {
  async criar(req, res) {
    const { ordemId } = req.params;
    const { quantidade } = req.body;

    const result = await requisicaoService.criarParaOrdem(ordemId, quantidade);

    res.json(result);
  },

  async atenderItem(req, res) {
    const { itemId } = req.params;
    const { quantidade } = req.body;

    const result = await requisicaoService.atenderItem(itemId, quantidade);

    res.json(result);
  },
  async justificar(req, res) {
    const { id } = req.params;
    const { justificativa } = req.body;

    if (!justificativa || justificativa.length < 20) {
      throw new Error('Justificativa muito curta');
    }

    await pool.query(
      `UPDATE itens_requisicao
     SET justificativa = $1
     WHERE id = $2`,
      [justificativa, id],
    );

    res.json({ message: 'Justificativa registrada' });
  },
};
