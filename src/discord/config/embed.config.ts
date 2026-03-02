export const embedConfig = {
  // Configuração da embed de posts/atualizações
  postEmbed: {
    // Cor da embed (em hexadecimal)
    // 0x00f0ff = ciano/azul claro
    // 0x5865F2 = azul Discord
    // 0x57F287 = verde
    // 0xFEE75C = amarelo
    // 0xEB459E = rosa
    color: 0x00f0ff,

    // Se true, mostra o autor no footer
    showAuthor: true,

    // Se true, usa a data de criação do post, se false usa a data atual
    usePostDate: true,

    // Mensão de cargo (deixe vazio '' para não mencionar ninguém)
    roleMention: '<@&939951821701644328>',

    // Título customizado (deixe vazio para usar o título do post)
    customTitle: '',

    // Prefixo para o footer do autor
    authorPrefix: '📝 Postado por: ',
  },

  // Configuração de limpeza de HTML
  htmlCleaning: {
    // Remove parágrafos vazios
    removeEmptyParagraphs: true,

    // Converte listas em bullets
    convertLists: true,

    // Máximo de linhas vazias consecutivas permitidas (1 = uma linha vazia, 2 = duas)
    maxEmptyLines: 1,
  },
};
