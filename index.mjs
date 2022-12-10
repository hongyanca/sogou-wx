import * as dotenv from 'dotenv';
dotenv.config();
import 'zx/globals';
import { generateIndexHtml } from './src/util.mjs';
import { getLatestArticle } from './src/sogou-wx-search.mjs';
import { saveWeixinArticle } from './src/weixin-article.mjs';
import defaults from './defaults.json' assert { type: 'json' };

const PUB_ACCOUNT = process.env.PUB_ACCOUNT || defaults.PUB_ACCOUNT;
const ARTICLE_SAVE_LOCATION = process.env.ARTICLE_SAVE_LOCATION || defaults.ARTICLE_SAVE_LOCATION;
const CHECK_INTERVAL = process.env.CHECK_INTERVAL || defaults.CHECK_INTERVAL;


const run = async () => {
  const accounts = fs.readJsonSync(PUB_ACCOUNT);

  // for (let i=1; i<accounts.length; i++) {
  for (let i=0; i<accounts.length; i++) {
    const article = await getLatestArticle(accounts[i]);
    if (!article) continue;

    const isSuccess = await saveWeixinArticle(article, ARTICLE_SAVE_LOCATION);
    if (isSuccess) {
      accounts[i].latest_article_md5 = article.titleChecksum;
    }
  }

  fs.writeJsonSync(PUB_ACCOUNT, accounts, { spaces: "  " });
  const articleListPage = generateIndexHtml(ARTICLE_SAVE_LOCATION, 
    accounts.map(account => account.wx_pub_account_id));
  fs.outputFileSync(`${ARTICLE_SAVE_LOCATION}/index.html`, articleListPage);
};


while (true) {
  await run();
  console.log(`Done at ${new Date()}`);
  await $`sleep ${CHECK_INTERVAL}`;
}