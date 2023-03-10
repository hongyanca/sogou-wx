import * as dotenv from 'dotenv';
dotenv.config();
import { downloadUrl } from './util.mjs';


export async function saveWeixinArticle(article, path) {
  // Todo:
  // implement video link replacement
  const { url, accountId, titleChecksum } = article;

  const savedArticleLocation = `${path}/${accountId}/${titleChecksum}.html`;
  if (fs.pathExistsSync(savedArticleLocation)) {
    console.log(`${savedArticleLocation} already exists. Skip saving article.`);
    return false;
  }

  let isSuccess = false;
  try {
    let pageHtml = await downloadUrl(url, 3);
  
    pageHtml = await replaceCSSLinksWithLocalFiles(
      pageHtml,
      `${path}/styles`,
      '../styles');
    
    pageHtml = await replaceImgLinksWithLocalFiles(
      pageHtml,
      `${path}/${accountId}/${titleChecksum}_files`,
      `./${titleChecksum}_files`
      );
    
    pageHtml = sanitizeArticlePage(pageHtml);
  
    const articlePath = `${accountId}/${titleChecksum}.html`;
    fs.outputFileSync(`${path}/${articlePath}`, pageHtml);
    isSuccess = true;

    const SITE_URL = process.env.TELEGRAM_MSG_ARTICLE_LOC;
    await sendTelegramMessage(`${article.accountName}%0A${SITE_URL}/${articlePath}`);
  } catch(error) {
    isSuccess = false;
    console.log(error);
  }

  return isSuccess;
}


async function replaceCSSLinksWithLocalFiles(pageHtml, saveLocation, linkPath) {
  let updatedPageHtml = pageHtml;

  const cssLinks = pageHtml.match(/<link.*?rel="stylesheet".*?>/g);
  for (let i=0; i<cssLinks.length; i++) {
    const link = cssLinks[i];
    const url = link.replace(/^.*?href="/, 'https:')
      .replace(/".*$/, '')
      .replace(/https:https:/, 'https:');

    const fileName = url.substring(url.lastIndexOf('/')+1);
    if (!fs.pathExistsSync(`${saveLocation}/${fileName}`)) {
      try {
        await $`mkdir -p ${saveLocation}`;
        const cssFileContent = await downloadUrl(url, 3);
        fs.outputFileSync(`${saveLocation}/${fileName}`, cssFileContent);
      } catch (error) {
        console.log(error);
      }
    };

    updatedPageHtml = updatedPageHtml
      .replace(link, `<link href="${linkPath}/${fileName}" rel="stylesheet">`);
  }
  
  return updatedPageHtml;
}


async function replaceImgLinksWithLocalFiles(pageHtml, saveLocation, linkPath) {
  let updatedPageHtml = pageHtml
    .replace(/<span class="js_img_placeholder wx_widget_placeholder".*?<\/span><\/span><\/span>/g, '');

  const imgLinks = pageHtml.match(/<img class="rich_pages.*?>/g);
  for (let i=0; i<imgLinks.length; i++) {
    const link = imgLinks[i];
    const url = link.replace(/^.*?data-src="/, '').replace(/".*>/, '');
    if (!url.match(/wx_fmt/)) {
      continue;
    }
    const fileFormat = url.match(/^.*?wx_fmt=([a-z]+)/)[1];
    const urlWithoutFormat = url.replace(url.substring(url.lastIndexOf('/')), '');
    const fileName = urlWithoutFormat
      .substring(urlWithoutFormat.lastIndexOf('/')+1) + '.' + fileFormat;

    try {
      await $`mkdir -p ${saveLocation} && 
        cd ${saveLocation} && 
        rm -f ${fileName} && 
        curl -sS -o ${fileName} ${url} -q`;
    } catch (error) {
      console.log(error);
    }

    updatedPageHtml = updatedPageHtml.replace(link, `<img src="${linkPath}/${fileName}">`);
  };

  return updatedPageHtml;
}


function sanitizeArticlePage(pageHtml) {
  const result = pageHtml
    .replace(/rich_media_area_extra"/g, `rich_media_area_extra" style="display:none"`)
    .replace(/qr_code_pc_inner"/g, 'qr_code_pc_inner" style="display:none"')
    .replace(/window.*?qr_code.*/g, '')
    .replace(/<script.*?js_network_msg(.|\s|\S)*?script>/g, '');

  return result;
}


async function sendTelegramMessage(message) {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_BOT_CHATID = process.env.TELEGRAM_BOT_CHATID;

  const isValidArg = (TELEGRAM_BOT_TOKEN && TELEGRAM_BOT_TOKEN.length > 0 &&
    TELEGRAM_BOT_CHATID && TELEGRAM_BOT_CHATID.length > 0);
  if (!isValidArg) {
    console.log('Invalid Telegram bot information. Failed to send Telegram message');
    return;
  }

  try {
    if (typeof message === 'string' || message instanceof String) {
      const apiEndpoint = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
      // Use %0A for message line break.
      const reqData = `chat_id=${TELEGRAM_BOT_CHATID}&text=${message}`;
      const response = await $`curl -sS -X POST ${apiEndpoint} -d ${reqData}`;
      if (response._stdout.match(/"ok":true/)) {
        console.log(`Telegram message sent by bot at ${new Date()}.`);
      };
    } else {
      throw("Invalid message.");
    }
  } catch(error) {
    console.log(error);
    console.log('Failed to send Telegram message.');
  }
}