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
  
    fs.outputFileSync(`${path}/${accountId}/${Date.now()}-${titleChecksum}.html`, pageHtml);
    isSuccess = true;
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
      await $`mkdir -p ${saveLocation}`;
      const cssFileContent = await downloadUrl(url, 3);
      try {
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
  let result = pageHtml
    .replace(/rich_media_area_extra"/g, `rich_media_area_extra" style="display:none"`);

  return result;
}