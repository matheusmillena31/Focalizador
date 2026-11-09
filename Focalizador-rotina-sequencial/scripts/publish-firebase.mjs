import { readFile, mkdir, readdir, copyFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

export const PROJECT_ID = 'focalizador-3d5d3';
const CLI_VERSION = '15.35.0';
const root = fileURLToPath(new URL('../', import.meta.url));

export function hostingSettings(config) {
  if (config?.hosting?.site !== PROJECT_ID || config.hosting.public !== 'web-public' || config.firestore || config.functions) throw new Error('Configuração inesperada. A publicação deve conter somente a interface deste projeto.');
  return config.hosting;
}
export function siteExists(response) {
  if (response.status !== 'success' || !Array.isArray(response.result?.sites)) throw new Error('Não foi possível verificar os sites deste projeto.');
  return response.result.sites.some(site => site.name === `projects/${PROJECT_ID}/sites/${PROJECT_ID}` || site.name?.endsWith(`/sites/${PROJECT_ID}`));
}
function cli(args, capture = false) {
  const result = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['--yes', `firebase-tools@${CLI_VERSION}`, ...args], { cwd: root, stdio: capture ? ['inherit', 'pipe', 'inherit'] : 'inherit', encoding: 'utf8', shell: process.platform === 'win32' });
  if (result.error || result.status !== 0) throw new Error(`A ferramenta do Firebase não concluiu a etapa ${args[0]}. Confira a mensagem acima e tente novamente.`);
  return result.stdout;
}
export async function publish() {
  hostingSettings(JSON.parse(await readFile(path.join(root, 'firebase.json'), 'utf8')));
  const built = spawnSync(process.execPath, ['scripts/build.mjs'], { cwd: root, stdio: 'inherit' });
  if (built.error || built.status !== 0) throw new Error('Não foi possível preparar a interface para publicação.');
  const publicDirectory = path.join(root, 'web-public');
  await mkdir(publicDirectory, { recursive: true });
  const files = await readdir(publicDirectory);
  if (files.some(name => name !== 'index.html')) throw new Error('A pasta web-public contém arquivos extras. Mova-os para outro local antes de publicar, para não enviá-los ao site.');
  await copyFile(path.join(root, 'Focalizador.html'), path.join(publicDirectory, 'index.html'));
  console.log('\nO login a seguir é na conta Google que administra o Firebase, não na conta do aplicativo.');
  console.log('Siga o endereço mostrado pela ferramenta oficial e cole o código de autorização nesta janela, se solicitado.\n');
  cli(['login', '--no-localhost']);
  const sites = JSON.parse(cli(['hosting:sites:list', '--project', PROJECT_ID, '--json'], true));
  if (!siteExists(sites)) cli(['hosting:sites:create', PROJECT_ID, '--project', PROJECT_ID, '--app', '1:915780007038:web:d863eca46bcb12f7f2542f', '--non-interactive']);
  cli(['deploy', '--only', 'hosting', '--project', PROJECT_ID, '--non-interactive']);
  console.log(`\nPublicação concluída. Abra https://${PROJECT_ID}.web.app no computador e no celular.`);
  console.log('Entre no Focalizador com o mesmo e-mail e senha do aplicativo e use Sincronizar agora.');
  console.log('O site online usa um armazenamento local diferente do arquivo HTML; os dados da conta chegam pela sincronização.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { await publish(); } catch (error) { console.error(`\n${error.message}`); process.exitCode = 1; }
}
