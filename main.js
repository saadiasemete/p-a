const Nightmare = require('nightmare')
const fs = require('fs')
require('nightmare-download-manager')(Nightmare);

nm_config = {
    show: true,
    executionTimeout: 30000,
    ignoreDownloads: true,
    switches: {
        'ignore-certificate-errors': true
    }
    //fullscreen: true,
}

function flattenArray(a){
    res = []
    for (i of a){
        for (j of i){
            res.push(j)
        }
    }
    return res
}

async function saveSafely(dataArray, prima, secunda, merge = true){

    data = await JSON.parse(fs.readFileSync(prima));

    await fs.writeFileSync(secunda, JSON.stringify(data));
    if (merge) newData = await data.concat(dataArray)
    else newData = dataArray;

    await fs.writeFileSync(prima, JSON.stringify(newData));
    
}



async function processCrawl(dataArray){

    await saveSafely(dataArray, "data.json", "data1.json");

}





function processLinks(origin, links){
    links = [...new Set(links)]
    return {
        "internal": links.filter(x=>(x.includes(origin)||x[0]=="/")).map(x => (x[0]=="/") ? origin+x : x),
        "external": links.filter(x=>!(x.includes(origin)||x[0]=="/")),
    }
}

function linksToDataArray(external, from, type){
    if (!external) return []
    return external.map(
        x => ({
            from,
            type,
            'data' : x,
        })
    )
};

function getEmails(search_in) {

    string_context = search_in.toString();
    
    array_mails = string_context.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);
    return array_mails;
    
}

function getFacebook(search_in) {

    string_context = search_in.toString();
    
    array_mails = string_context.match(/(?:(?:http|https):\/\/)?(?:www.)?(facebook.com|fb.me)\/(?:(?:\w)*#!\/)?(?:pages\/)?([\w\-]*)?/gi);
    return array_mails;
    
}

function getPersonalLIs(search_in) {

    string_context = search_in.toString();
    
    array_mails = string_context.match(/(?:(?:http|https):\/\/)?([\w\.]*)?linkedin.com\/in\/(?:(?:\w)*#!\/)?([\w\-]*)?/gi);
    return array_mails;
    
}

//"\?utm_source=[\w.]+(?:[\w\d.%-_])*"

function splitOccurences(textData){
    a = textData.split("\n").filter(x=>x.trim()).map(x=>x.split(" - ").map(x=>x.trim()))

    return flattenArray(a)
}


async function crawlPage(link, from, crawler){
    
    links = [];
    dataArray = [];

    try {
        await crawler.goto(link);
        try { //it is easier to ask for forgiveness in that case
            if (crawler.title().includes("Just a moment...")){
                await crawler.wait(6000);
            }
            else{
                await crawler.wait(500);
            }
        } catch (error) {
            
        }

        
        linksCollected = processLinks(
            (await crawler.evaluate(()=> document.location.origin)),
            (await crawler.evaluate(()=> {
                a = document.querySelectorAll("a[href]");
                res = [];
                a.forEach(x=>res.push(x.getAttribute('href')));
                return res.filter(x=>(x && !"#?&".includes(x.replace(document.location.origin,"")[0])));
                
            })
        )
        )

        links = linksCollected['internal'];
        dataArray.push({'data': await crawler.title(), 'type': 'title', 'from': link});
        doc = await crawler.evaluate(()=>document.body.innerHTML);

        dataArray = await dataArray.concat(
            await linksToDataArray(getEmails(doc), link, 'email'), 
            await linksToDataArray(getFacebook(doc), link, 'facebook'), 
            await linksToDataArray(getPersonalLIs(doc), link, 'linkedin'), 
            );
        
    } catch (error) {
        crawler.end().then((result)=>console.log(result)).catch((error)=>console.error(error));
        crawler=Nightmare(nm_config);
    }
    finally {

        await processCrawl(dataArray); //let us see how efficient all this "[pseudo]async" crap is!
        return {
            "links": links,
            "crawler": crawler,
        }
        
    }

}

async function saveStatus(linkStack, visited){
    await saveSafely(linkStack, "linkStack.json", "linkStack1.json", false);
    await saveSafely(visited, "visited.json", "visited1.json", false);
    
}

function filterCrapOut(links, linkStack, visited, from){
    
    links = links.map(i=>(i.split('#')[0].split('?')[0]))
    links = [...new Set(links)]
    yay = (a,b)=>{for (j of b) {if (a == j[0]){ return false;}} return true};
    return links.filter(i=>(yay(i,linkStack)&&yay(i,visited))).map(x=>[x, from])
}

async function workflow(linkStack, visited){
    crawler=Nightmare(nm_config);

    while (linkStack.length){
        elem = linkStack.shift();
        crawlRes = await crawlPage(elem[0], elem[1], crawler);
        visited.push(elem);

        linkStack = linkStack.concat(filterCrapOut(crawlRes['links'],linkStack,visited, elem[0]));

        await saveStatus(linkStack, visited);

        crawler = crawlRes['crawler']
    }
    crawler.end();
}

async function start(landing){ //for test purposes
    await workflow([[landing, "arachna://start"]], [])
}

async function resume(){
    await workflow(
        JSON.parse(fs.readFileSync('linkStack.json')),
        JSON.parse(fs.readFileSync('visited.json'))
    )
}

resume()