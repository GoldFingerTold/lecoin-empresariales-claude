// Envuelve un handler de Express async: si la promesa rechaza (por ejemplo, falla una
// consulta a Mongo), el error se manda a next(err) en vez de perderse silenciosamente
// (Express 4 no atrapa rechazos de promesas por su cuenta).
module.exports = function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
