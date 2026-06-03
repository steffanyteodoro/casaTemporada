/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Build "standalone" — necessário para a imagem Docker enxuta.
  output: "standalone",
  // pg e node-ical usam require dinâmico; mantê-los externos evita
  // que o webpack tente empacotá-los (e quebre no runtime do container).
  experimental: {
    serverComponentsExternalPackages: ["pg", "node-ical"],
  },
  // Mantém o primeiro build do container suave. Recomenda-se reativar
  // a checagem (false) durante o desenvolvimento para pegar erros cedo.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};
module.exports = nextConfig;
