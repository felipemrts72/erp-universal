export function normalizeNumbers(req, res, next) {
  // 🔥 campos que DEVEM ser número no sistema inteiro
  const camposNumericos = [
    'quantidade',
    'preco',
    'preco_unitario',
    'precoVenda',
    'custo',
    'estoqueMinimo',
  ];

  function tratar(obj) {
    for (const key in obj) {
      const value = obj[key];

      if (typeof value === 'string' && camposNumericos.includes(key)) {
        let v = value.trim();

        // remove separador de milhar
        v = v.replace(/\./g, '');

        // troca vírgula por ponto
        v = v.replace(',', '.');

        const numero = Number(v);

        if (!isNaN(numero)) {
          obj[key] = numero;
        }
      } else if (typeof value === 'object' && value !== null) {
        tratar(value); // recursivo (componentes, arrays, etc)
      }
    }
  }

  tratar(req.body);
  next();
}
