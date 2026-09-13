// FIXTURE NEGATIVO — @keyframes en un componente agarrable (RNF-12).
//
// Nada de esto puede estar en un comentario: el freno barre el código SIN
// comentarios, y un fixture que solo dispara desde un comentario no prueba
// que el freno vea el código.
export const estilo = { touchAction: "none", animationName: "deslizar" };

export const hoja = `
  @keyframes deslizar { from { transform: translateY(0) } to { transform: translateY(100%) } }
`;
