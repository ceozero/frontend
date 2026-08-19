const baseConfig = {
  requestLibPath: "import request from '@workspace/ui/lib/request';",
  serversPath: "./src/services",
  apiPrefix: "import.meta.env.VITE_API_PREFIX || ''",
};

const config = [
  {
    ...baseConfig,
    schemaPath:
      "https://raw.githubusercontent.com/perfect-panel/frontend/refs/heads/main/docs/public/swagger/common.json",
    projectName: "common",
  },
  {
    ...baseConfig,
    schemaPath:
      "https://raw.githubusercontent.com/perfect-panel/frontend/refs/heads/main/docs/public/swagger/user.json",
    projectName: "user",
  },
  {
    ...baseConfig,
    schemaPath:
      "https://raw.githubusercontent.com/perfect-panel/frontend/refs/heads/main/docs/public/swagger/admin.json",
    projectName: "admin",
  },
  {
    ...baseConfig,
    schemaPath:
      "https://raw.githubusercontent.com/perfect-panel/frontend/refs/heads/main/docs/public/swagger/gateway.json",
    apiPrefix: "",
    projectName: "gateway",
  },
];

export default config;
