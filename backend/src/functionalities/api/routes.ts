import { getApiPingController, getApiStatusController } from "./controllers";

export const apiRoutes = {
    '/api/api/status': {
      GET: getApiStatusController,
    },
    '/api/api/ping': {
      GET: getApiPingController,
    },
  };