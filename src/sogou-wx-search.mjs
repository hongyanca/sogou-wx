import * as dotenv from 'dotenv';
dotenv.config();
import 'zx/globals';
import hash from 'object-hash';
import defaults from '../defaults.json' assert { type: 'json' };
import { fetchWebPageContent } from './util.mjs';


function extractTitle(anchorElement) {
  const match = anchorElement.match(/>.*?<\/a/);
  if (!match || !Array.isArray(match)) {
    return '';
  }
  
  return match[0].substring(match[0].indexOf('>')+1, match[0].indexOf('<'));
}


function extractTitleChecksum(anchorElement) {
  return hash(extractTitle(anchorElement));
}


function extractSogouLink(anchorElement) {
  const SOGOU_WX_BASE = process.env.SOGOU_WX_BASE || defaults.SOGOU_WX_BASE;

  const match = anchorElement.match(/href="\/(.*?)"/);
  if (match && Array.isArray(match)) {
    return `${SOGOU_WX_BASE}/${match[1]}`;
  }
  return '';
}


async function getSogouCookies() {
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
      }
      
      const matchSUV = item.match(/(SUV=.*?)(;.*$)/);
      if (matchSUV && matchSUV[1]) {
        result.SUV = matchSUV[1];
      }
    });
  } catch (error) {
    console.log(error);
  } 
  
  return result;
}


async function extractWxPubAccountArticleUrl(anchorElement) {
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
    const pageHtml = await fetchWebPageContent(sogouLink, [cookies.SNUID, cookies.SUV]);
    if (!pageHtml) {
      throw('Failed to extract weixin article link.');
    }
    const urlFragments = pageHtml.match(/url\s\+=.*/g);
    urlFragments && urlFragments.forEach(elem => {
      weixinUrl = weixinUrl + elem.substring(elem.indexOf(`'`)+1, elem.lastIndexOf(`'`));
    });
  } catch (error) {
    console.log(error);
  }
  
  return weixinUrl.length > 0 ? weixinUrl : null;
}


export async function getLatestArticle(account) {
  const SOGOU_WX_QUERY_BASE = process.env.SOGOU_WX_QUERY_BASE || defaults.SOGOU_WX_QUERY_BASE;
  const ARTICLE_SAVE_LOCATION = process.env.ARTICLE_SAVE_LOCATION || defaults.ARTICLE_SAVE_LOCATION;

  const sogouQueryUrl = SOGOU_WX_QUERY_BASE + account.wx_pub_account_id;
  const pageHtml = await fetchWebPageContent(sogouQueryUrl);

  if (!pageHtml) {
    return null;
  }

  const articleLinks = pageHtml.match(/<a.*?account_article_.*?<\/a>/g);
  if (!articleLinks || 
    !Array.isArray(articleLinks) ||
    articleLinks.length <= account.article_index ||
    !articleLinks[account.article_index]) {
    return null;
  }

  const anchorElement = articleLinks[account.article_index];
  const checksum = extractTitleChecksum(anchorElement);
  // If the latest article has been saved, skip the download.
  if (account.latest_article_md5 === checksum &&
    fs.existsSync(`${ARTICLE_SAVE_LOCATION}/${account.wx_pub_account_id}/${checksum}_files`)) {
    console.log('This article already exists.');
    return null;
  }
  const articleUrl = await extractWxPubAccountArticleUrl(anchorElement);
  if (!articleUrl) {
    return null;
  }

  return { 
    accountId: account.wx_pub_account_id,
    url: articleUrl,
    titleChecksum: checksum
  };
}