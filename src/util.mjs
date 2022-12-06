import 'zx/globals';


export async function fetchWithProxy(url) {
  let pageHtml = '';
  
  for (let i=0; i<process.env.RETRY_COUNT; i++) {
    let exitCode = 1;

    try {
      let proxy = await getProxy();
      const response = await $`curl -sS --max-time ${process.env.CURL_TIMEOUT} -x "${proxy}" ${url}`;
      // Use the black listed proxy 182.90.224.115:3128 for test.
      // const response = await $`curl -sS --max-time ${process.env.CURL_TIMEOUT} -x "182.90.224.115:3128" ${url}`;
      
      pageHtml = response._stdout || '';
      // Proxy worked, but sogou antispider has detected the fetch.
      if (pageHtml.indexOf('<title>302 Found</title>') >= 0 || pageHtml.length < 200) {
        exitCode = 1;
        throw({ exitCode: 1, stderr: 'Detected by sogou antispider.' });
      } else {
        exitCode = 0;
      }
    } catch (p) {
      pageHtml = '';
      exitCode = p.exitCode;
      console.log(`Retry count ${i+1}. Error: ${p.stderr}`);
    }
    
    if (exitCode === 0) break;
  }

  return pageHtml;
}


export async function getProxy() {
  let proxy = null;

  try {
    const response = await fetch(process.env.PROXY_POOL);
    proxy = await response.text();
  } catch (error) {
    console.error(error)
  }
    
  return proxy;
}