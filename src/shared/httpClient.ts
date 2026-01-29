import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { generateHmac } from './hmac';
import { config } from '../config';
import { getRequestId } from './context';

function createCasinoClient(): AxiosInstance {
  const client = axios.create({
    baseURL: config.urls.casinoBaseUrl,
    timeout: 10000,
  });

  client.interceptors.request.use((reqConfig: InternalAxiosRequestConfig) => {
    const body = reqConfig.data ? JSON.stringify(reqConfig.data) : '';
    const timestamp = Date.now().toString();
    const signature = generateHmac(config.hmac.casinoSecret, `${timestamp}:${body}`);

    reqConfig.headers.set('x-casino-signature', signature);
    reqConfig.headers.set('x-timestamp', timestamp);
    reqConfig.headers.set('Content-Type', 'application/json');

    const requestId = getRequestId();
    if (requestId) {
      reqConfig.headers.set('x-request-id', requestId);
    }

    return reqConfig;
  });

  return client;
}

function createProviderClient(): AxiosInstance {
  const client = axios.create({
    baseURL: config.urls.providerBaseUrl,
    timeout: 10000,
  });

  client.interceptors.request.use((reqConfig: InternalAxiosRequestConfig) => {
    const body = reqConfig.data ? JSON.stringify(reqConfig.data) : '';
    const timestamp = Date.now().toString();
    const signature = generateHmac(config.hmac.providerSecret, `${timestamp}:${body}`);

    reqConfig.headers.set('x-provider-signature', signature);
    reqConfig.headers.set('x-timestamp', timestamp);
    reqConfig.headers.set('Content-Type', 'application/json');

    const requestId = getRequestId();
    if (requestId) {
      reqConfig.headers.set('x-request-id', requestId);
    }

    return reqConfig;
  });

  return client;
}

export function setRequestContext(requestId: string) {

  // No-op: Context is handled by AsyncLocalStorage in requestIdMiddleware

}



export const casinoClient = createCasinoClient();

export const providerClient = createProviderClient();
