export type EventTargetType =
  | "sessao"
  | "pasta"
  | "arquivo"
  | "favorito"
  | "compartilhamento"
  | "membro"
  | "repositorio";

export const EVENT_CATEGORY_LABEL: Record<EventTargetType, string> = {
  sessao: "Sessao",
  pasta: "Pastas",
  arquivo: "Arquivos",
  favorito: "Favoritos",
  compartilhamento: "Compartilhamento",
  membro: "Membros",
  repositorio: "Repositorios",
};

export const EVENT_ACTION_LABEL: Record<string, string> = {
  login: "Entrou na conta",
  logout: "Saiu da conta",
  criar_pasta: "Criou a pasta",
  renomear_pasta: "Renomeou a pasta para",
  mover_pasta: "Moveu a pasta",
  travar_pasta: "Travou a pasta",
  destravar_pasta: "Destravou a pasta",
  mover_pasta_lixeira: "Enviou a pasta para a lixeira",
  restaurar_pasta: "Restaurou a pasta",
  excluir_pasta_definitivo: "Excluiu definitivamente a pasta",
  upload_arquivo: "Enviou o arquivo",
  download_arquivo: "Baixou o arquivo",
  renomear_arquivo: "Renomeou o arquivo para",
  mover_arquivo: "Moveu o arquivo",
  mover_arquivo_lixeira: "Enviou o arquivo para a lixeira",
  restaurar_arquivo: "Restaurou o arquivo",
  excluir_arquivo_definitivo: "Excluiu definitivamente o arquivo",
  favoritar: "Favoritou",
  desfavoritar: "Removeu dos favoritos",
  compartilhar_pasta: "Compartilhou a pasta",
  remover_compartilhamento: "Removeu o compartilhamento de",
  criar_link_publico: "Criou um link publico para",
  revogar_link_publico: "Revogou o link publico de",
  criar_membro: "Criou o membro",
  editar_membro: "Editou o membro",
  resetar_senha_membro: "Resetou a senha de",
  excluir_membro: "Excluiu o membro",
  criar_repositorio: "Criou o repositorio",
  editar_cota_repositorio: "Editou a cota do repositorio",
};

export const EVENT_CATEGORY_OF_ACTION: Record<string, EventTargetType> = {
  login: "sessao",
  logout: "sessao",
  criar_pasta: "pasta",
  renomear_pasta: "pasta",
  mover_pasta: "pasta",
  travar_pasta: "pasta",
  destravar_pasta: "pasta",
  mover_pasta_lixeira: "pasta",
  restaurar_pasta: "pasta",
  excluir_pasta_definitivo: "pasta",
  upload_arquivo: "arquivo",
  download_arquivo: "arquivo",
  renomear_arquivo: "arquivo",
  mover_arquivo: "arquivo",
  mover_arquivo_lixeira: "arquivo",
  restaurar_arquivo: "arquivo",
  excluir_arquivo_definitivo: "arquivo",
  favoritar: "favorito",
  desfavoritar: "favorito",
  compartilhar_pasta: "compartilhamento",
  remover_compartilhamento: "compartilhamento",
  criar_link_publico: "compartilhamento",
  revogar_link_publico: "compartilhamento",
  criar_membro: "membro",
  editar_membro: "membro",
  resetar_senha_membro: "membro",
  excluir_membro: "membro",
  criar_repositorio: "repositorio",
  editar_cota_repositorio: "repositorio",
};
