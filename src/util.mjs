import * as dotenv from 'dotenv';
dotenv.config();
import 'zx/globals';
import defaults from '../defaults.json' assert { type: 'json' };

const PROXY_POOL = process.env.PROXY_POOL || defaults.PROXY_POOL;
const CONNECT_TIMEOUT = process.env.CONNECT_TIMEOUT || defaults.CONNECT_TIMEOUT;
const RETRY_COUNT = process.env.RETRY_COUNT || defaults.RETRY_COUNT;

export async function fetchWithProxy(url) {
  let pageHtml = await downloadWithOptionalProxy(url, null);
  if (pageHtml && pageHtml.length >= 200) {
    return pageHtml;
  }

  for (let i=0; i<RETRY_COUNT; i++) {
    const proxy = await getProxy();
    if (!proxy) {
      await $`echo 'Failed to get proxy.' && sleep 3`;
      continue;
    }

    pageHtml = await downloadWithOptionalProxy(url, proxy);
    if (pageHtml && pageHtml.length >= 200) {
      break;
    }
  }

  return pageHtml;
}


export async function getProxy() {
  let proxy = null; 

  try {
    const response = await fetch(PROXY_POOL);
    proxy = await response.text();
  } catch (error) {
    console.error(error)
  }
  
  if (!proxy.match(/[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+:[0-9]+/)) {
    return null;
  }
  
  return proxy;
}


export async function downloadUrl(url, retry = RETRY_COUNT) {
  let content = null;

  for (let i=0; i<RETRY_COUNT; i++) {
    try {
      const response = await fetch(url);
      if (response.status !== 200) {
        throw(`Failed to fetch the article. Status code: ${response.status}`);
      }
      content = await response.text();
      break;
    } catch (error) {
      console.log(error);
      content = null;
    }
  }

  return content;
}


async function downloadWithOptionalProxy(url, proxy = null) {
  let pageHtml = '';
  
  try {
    let response = null;
    if (proxy && proxy.length > 0) {
      response = await $`curl -sS --max-time ${CONNECT_TIMEOUT} -x "${proxy}" ${url}`;
    } else {
      response = await $`curl -sS --max-time ${CONNECT_TIMEOUT} ${url}`;
    }  
    
    pageHtml = response._stdout || '';
    // Proxy worked, but sogou antispider has detected the fetch.
    if (pageHtml.indexOf('<title>302 Found</title>') >= 0 || pageHtml.length < 200) {
      throw({ exitCode: 1, stderr: 'Detected by sogou antispider.' });
    }
  } catch (error) {
    pageHtml = '';
    console.log(`Error: ${error.stderr}`);
  }

  if (pageHtml.length === 0) {
    return null;
  }

  return pageHtml;
}