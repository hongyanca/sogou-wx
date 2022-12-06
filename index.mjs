import * as dotenv from 'dotenv';
dotenv.config();
import playwright from 'playwright';
import 'zx/globals';
import { fetchWithProxy } from './src/util.mjs';
import { extractTitle, extractTitleChecksum, extractWxPubAccountArticleUrl } from './src/sogou-result.mjs';
import { saveWeixinArticle } from './src/weixin-article.mjs';
import defaults from './defaults.json' assert { type: 'json' };

const PUB_ACC_LOC = './pub-accounts.json';


const ARTICLE_BASE = process.env.SAVED_ARTICLE_LOCATION || defaults.SAVED_ARTICLE_LOCATION;

const run = async () => {

  const accounts = fs.readJsonSync(PUB_ACC_LOC);
  for (let i=0; i<accounts.length; i++) {
    const sogouQueryUrl = process.env.SOGOU_WX_QUERY_BASE + accounts[i].wx_pub_account_id;
    const pageHtml = await fetchWithProxy(sogouQueryUrl);
    if (pageHtml.length === 0) {
      continue;
    }
    
    const articleLinks = pageHtml.match(/<a.*?account_article_.*?<\/a>/g);
    if (!articleLinks || 
      !Array.isArray(articleLinks) ||
      articleLinks.length <= accounts[i].article_index ||
      !articleLinks[accounts[i].article_index]) {
      continue;
    }

    const anchorElement = articleLinks[accounts[i].article_index];

    // console.log('✅', extractTitle(anchorElement), '㊙️', extractTitleChecksum(anchorElement));
    
    const checksum = extractTitleChecksum(anchorElement);

    const articleUrl = await extractWxPubAccountArticleUrl(anchorElement);
    await saveWeixinArticle(articleUrl, accounts[i].wx_pub_account_id, ARTICLE_BASE, checksum);
    
  }

  process.exit(0); 
};





await run();