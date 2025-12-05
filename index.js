require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');

const BOT_TOKEN = process.env.TOKEN;
if (!BOT_TOKEN) {
  console.error('Please set BOT_TOKEN environment variable.');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const CHANNEL_ID = process.env.CHANNEL_ID;

const POEMS_PATH = path.join(__dirname, 'poems.json');

// load poems
let poems = [];
try {
  poems = JSON.parse(fs.readFileSync(POEMS_PATH, 'utf8'));
  if (!Array.isArray(poems) || poems.length === 0) {
    throw new Error('poems.json must be a non-empty array');
  }
} catch (err) {
  console.error('Failed to load poems.json:', err.message);
  process.exit(1);
}

// helper: pick a random poem
function pickRandomPoemForUser() {
  const idx = Math.floor(Math.random() * poems.length);
  const entry = poems[idx];

  const poem = Array.isArray(entry.poem) ? entry.poem.join('\n') : entry.poem;
  const tafsir = entry.interpretation || '';

  const reply = `🎯 ${entry.title}\n\n${poem}\n\n📜 تفسیر / معنی:\n${tafsir}`;
  return reply;
}

// glass-style inline button text helper (we simulate glass with emojis and spaced text)
const BUTTONS = {
  WISH: '🔮  نیت کن و فال خود را بگیر',
  YES: '✅  آره درست بود',
  NO: '❌  نه، درست نبود',
  RETRY: '🔮  دوباره نیت کن',
  POSTCARD: '🎁  دریافت کارت‌پستال',
};

bot.start(async (ctx) => {
  const channelInvText = `لطفا در چنل ساخت کیوآرکد ما عضو بشین
چون براتون یه آفر جذاب گذاشتیم: کارت‌پستال موزیکال
با امکان گذاشتن صدا🎙️ متن📜 عکس📸 ویدیو🎥
به صورت رایگان در دانشگاه بهتون تحویل میدیم 🫶
'📢 عضویت در کانال 
 https://t.me/lahzeqrcode
`;
  ctx.reply(channelInvText, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '🔮 نیت کن و فال بگیر ',
            callback_data: 'check_join',
          },
        ],
      ],
    },
  });
});

bot.action('check_join', async (ctx) => {
  const userId = ctx.from.id;

  const member = await ctx.telegram.getChatMember(CHANNEL_ID, userId);

  const isMember =
    member.status === 'member' || member.status === 'creator' || member.status === 'administrator';

  if (!isMember) {
    return ctx.answerCbQuery('❌ لطفاً اول عضو کانال شوید!', {
      show_alert: true,
    });
  }
  await ctx.answerCbQuery();

  const poem = pickRandomPoemForUser();

  await ctx.reply(poem);

  await ctx.reply(
    'آیا فالت درست درآمد؟',
    Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ آره درست بود', 'correct_yes'),
        Markup.button.callback('❌ نه درست نبود', 'correct_no'),
      ],
    ])
  );
});

// handle the "wish" callback -> show random fal
bot.action('wish', async (ctx) => {
  console.log('x');

  try {
    await ctx.answerCbQuery();
  } catch (e) {}

  const userId = ctx.from.id;

  // Check membership
  try {
    const member = await ctx.telegram.getChatMember(CHANNEL_ID, userId);
    const status = member.status; // "member", "administrator", "creator", etc.

    if (status !== 'member' && status !== 'administrator' && status !== 'creator') {
      // user is NOT a channel member
      return ctx.reply(
        'برای گرفتن فال باید ابتدا عضو کانال ما بشی 🌹',
        Markup.inlineKeyboard([
          [Markup.button.url('📢 عضویت در کانال', 'https://t.me/lahzeqrcode')],
          [Markup.button.callback('🔄 امتحان دوباره', 'wish')],
        ])
      );
    }
  } catch (err) {
    console.log('Membership check failed:', err);
    return ctx.reply('خطا در بررسی عضویت. لطفاً دوباره تلاش کن.');
  }

  // If user *is* a member → continue to show fal
  const poem = pickRandomPoemForUser();

  await ctx.reply(poem);

  await ctx.reply(
    'آیا فالت درست درآمد؟',
    Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ آره درست بود', 'correct_yes'),
        Markup.button.callback('❌ نه درست نبود', 'correct_no'),
      ],
    ])
  );
});

// handle YES
bot.action('correct_yes', async (ctx) => {
  try {
    await ctx.answerCbQuery();
  } catch (e) {}

  const text = `ای ول! 🎉
اگه خواستی بهش حرفتو بزنی، از ما کارت‌پستال موزیکال بگیر و قبل از اینکه دیر بشه حرفتو برسون 🎙️❤️`;

  await ctx.reply(
    text,
    Markup.inlineKeyboard([[Markup.button.callback(BUTTONS.POSTCARD, 'get_postcard')]])
  );
});

// handle postcard CTA (placeholder - adapt to your postcard flow)
bot.action('get_postcard', async (ctx) => {
  try {
    await ctx.answerCbQuery();
  } catch (e) {}
  // Provide instructions or link to channel / web form
  await ctx.reply(
    'برای دریافت کارت‌پستال موزیکال لطفاً به کانال ما در لینک زیر مراجعه کنید:\nhttps://t.me/lahzeqrcode\n\nدر کانال، دستورالعمل‌های لازم برای سفارش کارت‌پستال را خواهید یافت. ممنون که با ما همراهی می‌کنید! 🎁📬'
  );
});

// handle NO
bot.action('correct_no', async (ctx) => {
  try {
    await ctx.answerCbQuery();
  } catch (e) {}
  // Ask if user wants to try again — this creates the loop
  await ctx.reply(
    'باشه… میخوای دوباره نیت کنی و یه فال دیگه بگیری؟',
    Markup.inlineKeyboard([[Markup.button.callback(BUTTONS.RETRY, 'wish')]])
  );
});

process.once('SIGINT', () => {
  console.log('SIGINT, stopping bot...');
  bot.stop('SIGINT');
  process.exit(0);
});
process.once('SIGTERM', () => {
  console.log('SIGTERM, stopping bot...');
  bot.stop('SIGTERM');
  process.exit(0);
});

bot
  .launch()
  .then(() => {
    console.log('Hafez fal bot started with Telegraf.');
  })
  .catch((err) => {
    console.error('Failed to launch bot:', err);
  });
