const mysql = require('mysql2/promise');

const app = {}

app.init = async () => {
    // prisijungti prie duomenu bazes
    const connection = await mysql.createConnection({   //[rows = [], felds = []]
        host: 'localhost',
        user: 'root',
        database: 'social',
    });

    let sql = '';
    let rows = [];
    let i = 0;

    function upperName(str) {
        return str[0].toUpperCase() + str.slice(1);
    }

    function formatDate(time) {
        const d = new Date(time);
        const dformat = [d.getFullYear(), d.getMonth() + 1,
        d.getDate(),].join('-') + ' ' +
            [d.getHours(),
            d.getMinutes(),
            d.getSeconds()].join(':');
        return dformat
    }

    //1. Registruotu vartotoju sarasas, isrikiuotas nuo naujausio link 
    //seniausio. Reikia nurodyti varda, post'u kieki, komentaru kieki ir like'u kieki
    sql = 'SELECT `users`.`id`, `firstname`, \
            COUNT(DISTINCT `posts`.`id`) as posts, COUNT(DISTINCT `comments`.`id`) as comments, COUNT(DISTINCT `posts_likes`.`id`) as likes\
            FROM `users`\
            LEFT JOIN `posts`\
                ON `posts`.`user_id` = `users`.`id`\
            LEFT JOIN `comments`\
                ON `comments`.`user_id` = `users`.`id`\
            LEFT JOIN `posts_likes`\
                ON `posts_likes`.`user_id` = `users`.`id`\
            GROUP BY `users`.`id`\
            ORDER BY `register_date` DESC';
    [rows] = await connection.execute(sql);

    console.log(`Users: `);
    for (let item of rows) {
        console.log(`${++i}. ${upperName(item.firstname)}: posts (${item.posts}), comments (${item.comments}), likes (${item.likes});`);
    }

    //2. Isspausdinti, koki turini turetu matyti Ona (antrasis vartotojas). Irasus pateikti nuo naujausio_
    sql = 'SELECT `users`.`firstname`, `posts`.`text`, `posts`.`date` \
            FROM `posts` \
            LEFT JOIN `users` \
                ON `users`.`id` = `posts`.`user_id` \
            LEFT JOIN `friends` \
                ON `friends`.`friend_id` = `posts`.`user_id` \
            WHERE `friends`.`user_id` = 2\
            ORDER BY `posts`.`date` DESC';
    [rows] = await connection.execute(sql);
    console.log("Onas's feed:");
    for (let { firstname, text, date } of rows) {
        console.log(`${upperName(firstname)} wrote a post "${text}" (${formatDate(date)});`);
    }
    console.log('');

    //3. --------------

    //4. Isspausdinti, kas kokius draugus stebi (visi vartotojai)
    sql = 'SELECT `user_id`, `friend_id`, `follow_date` as date,\
            (SELECT `users`.`firstname`\
            FROM `users`\
            WHERE `users`.`id` = `friends`.`friend_id`) as friend,\
            (SELECT `users`.`firstname`\
            FROM `users`\
            WHERE `users`.`id` = `friends`.`user_id`) as user\
            FROM `friends`';

    [rows] = await connection.execute(sql);
    console.log("User's relationships:");
    for (let { friend, user, date } of rows) {
        console.log(`${++i} ${upperName(user)} is following ${upperName(friend)} (since ${formatDate(date)});`);
    }
    console.log('');

    //5. Koks yra like'u naudojamumas. Isrikiuoti nuo labiausiai naudojamo
    sql = 'SELECT `like_options`.`id`, `like_options`.`text`,\
                    `posts_likes`.`like_option_id`, \
                    COUNT(`posts_likes`.`like_option_id`) as panaudota\
            FROM `like_options`\
            LEFT JOIN `posts_likes`\
                ON `posts_likes`.`like_option_id` = `like_options`.`id`\
            GROUP BY `like_options`.`id`\
            ORDER BY `panaudota` DESC';
    [rows] = await connection.execute(sql);

    console.log('Like options statistics:');
    for (const { text, panaudota } of rows) {
        console.log(`1. ${text} - ${panaudota} time;`);
    }

    //6. Isspausdinti visus komentarus, kuriuose yra nurodytas paieskos tekstas. Jei nieko nerasta, tai parodyti atitinkama pranesima. Visa tai turi buti funkcijos pavydale, kuri gauna vieninteli parametra - paieskos fraze
    async function searchBox(str) {
        sql = sql = 'SELECT * FROM `comments` WHERE `text` LIKE "%' + str + '%"';
        [rows] = await connection.execute(sql);
        if (rows.length === 0) { //tikrinam ar array tuscias
            console.error(`ERROR:Tokio komentaro nera`);
        } else {
            console.log(`Comments with search term "${str}":`);
            count = 0;
            for (let { text, date } of rows) {
                console.log(`${++count}. "${text}" (${formatDate(date)});`);
            }
        }

    }

    await searchBox('nice');
    await searchBox('x');


}

app.init();

module.exports = app;