import 'zx/globals';
import hash from 'object-hash';
import defaults from '../defaults.json' assert { type: 'json' };

const CONNECT_TIMEOUT = process.env.CONNECT_TIMEOUT || defaults.CONNECT_TIMEOUT;

export function extractTitle(anchorElement) {
  const match = anchorElement.match(/>.*?<\/a/);
  if (!match || !Array.isArray(match)) {
    return '';
  }
  
  return match[0].substring(match[0].indexOf('>')+1, match[0].indexOf('<'));
}


export function extractTitleChecksum(anchorElement) {
  return hash(extractTitle(anchorElement));
}


export function extractSogouLink(anchorElement) {
  const match = anchorElement.match(/href="\/(.*?)"/);
  if (match && Array.isArray(match)) {
    return `${process.env.SOGOU_WX_BASE}/${match[1]}`;
  }
  return '';
}


export async function getSogouCookies() {
  const result = { SNUID: '', SUV: '' };

  try {
    const response = await fetch('https://v.sogou.com/');
    const cookies = response.headers.raw()['set-cookie'];

    if (!Array.isArray(cookies)) {
      throw('Failed to fetch cookies.');
    }
    cookies.forEach(item => {
      const matchSNUID = item.match(/(SNUID=.*?)(;.*$)/);
      if (matchSNUID && matchSNUID[1]) {
        result.SNUID = matchSNUID[1];
        // result.SNUID = matchSNUID[1].substring('SNUID='.length);
      }
      
      const matchSUV = item.match(/(SUV=.*?)(;.*$)/);
      if (matchSUV && matchSUV[1]) {
        result.SUV = matchSUV[1];
        // result.SUV = matchSUV[1].substring('SUV='.length);
      }
    });
  } catch (error) {
    console.log(error);
  } 
  
  return result;
}


export async function extractWxPubAccountArticleUrl(anchorElement) {
  const sogouLink = extractSogouLink(anchorElement);
  if (sogouLink.length === 0) {
    return '';
  }

  const cookies = await getSogouCookies();
  if (cookies.SNUID.length === 0 || cookies.SUV.length === 0) {
    return '';
  }

  let weixinUrl = '';

  try {
    const response = await $`curl -sS --max-time ${CONNECT_TIMEOUT} --cookie "${cookies.SNUID}" --cookie "${cookies.SUV}" ${sogouLink}`;
    const pageHtml = response._stdout || '';
    const urlFragments = pageHtml.match(/url\s\+=.*/g);
    urlFragments && urlFragments.forEach(elem => {
      weixinUrl = weixinUrl + elem.substring(elem.indexOf(`'`)+1, elem.lastIndexOf(`'`));
    });
  } catch (error) {
    console.log(error);
  }
  
  return weixinUrl;
}


