import { State } from "./types/State";
import { URL } from "react-native-url-polyfill";
import { IWebBrowser } from "./types/IWebBrowser";
import { SdkInitParams, SdkLoginParams, SdkLogoutParams } from "./types/sdk";
import log from "loglevel";
import base64url from "base64url";

class Web3Auth {
  initParams: SdkInitParams;
  webBrowser: IWebBrowser;
  constructor(webBrowser: IWebBrowser, initParams: SdkInitParams) {
    this.initParams = initParams;
    if (!this.initParams.sdkUrl) {
      this.initParams.sdkUrl = "https://sdk.openlogin.com";
    }
    this.webBrowser = webBrowser;
  }

  private async request(
    path: string,
    params: Record<string, any> = {},
    redirectUrl: string
  ) {
    const initParams = {
      ...this.initParams,
      clientId: this.initParams.clientId,
      network: this.initParams.network,
      ...(!!this.initParams.redirectUrl && {
        redirectUrl: this.initParams.redirectUrl,
      }),
    };

    const mergedParams = {
      init: initParams,
      params: {
        ...params,
        ...(!params.redirectUrl && { redirectUrl: redirectUrl }),
      },
    };

    log.debug(`[Web3Auth] params passed to Web3Auth: ${mergedParams}`);

    const hash = base64url.encode(JSON.stringify(mergedParams));

    const url = new URL(this.initParams.sdkUrl);
    url.pathname = url.pathname + `${path}`;
    url.hash = hash;

    log.info(
      `[Web3Auth] opening login screen in browser at ${url.href}, will redirect to ${redirectUrl}`
    );

    return await this.webBrowser.openAuthSessionAsync(url.href, redirectUrl);
  }

  async login(options: SdkLoginParams): Promise<State> {
    const result = await this.request("login", options, options.redirectUrl);
    if (result.type != "success" || !result.url) {
      log.error(`[Web3Auth] login flow failed with error type ${result.type}`);
      throw new Error(`login flow failed with error type ${result.type}`);
    }

    const fragment = new URL(result.url).hash;
    const decodedPayload = base64url.decode(fragment);
    const state = JSON.parse(decodedPayload);
    return state;
  }

  async logout(options: SdkLogoutParams): Promise<void> {
    const result = await this.request("logout", options, options.redirectUrl);
    if (result.type != "success" || !result.url) {
      log.error(`[Web3Auth] logout flow failed with error type ${result.type}`);
      throw new Error(`logout flow failed with error type ${result.type}`);
    }
  }
}

export default Web3Auth;
