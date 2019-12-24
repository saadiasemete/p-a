import json,re

def FQDN_from_http(link):
    re1='.*?'	# Non-greedy match on filler
    re2='((?:[a-z\\.\\d\\-]+)\\.(?:[a-z][a-z\\-]+))(?![\\w\\.])'	# Fully Qualified Domain Name 1

    rg = re.compile(re1+re2,re.IGNORECASE|re.DOTALL)
    m = rg.search(link)
    if m:
        return m.group(1)
    else:
        return None

def URI_from_http(link):
    if link == None:
        return ""
    
    link = FQDN_from_http(link)
    if link == None:
        return ""
    try:
        link = '.'.join(link.split('.')[-2:])
    except:
        link = ""
        
    #link = domain_reformat.subdomain_methodology(link)
    return link

def remove_twitter():
    a = json.load(open("linkStack.json","r") )

    res = [i for i in a if not URI_from_http(i[0]) in ["twitter.com", "t.co"]]

    json.dump(res, open("linkStack.json", "w"))

def to_linkstack():
    json.dump([[i.strip(), "arachna://start"] for i in open("linksToCrawl.txt").readlines()], open("linkStack.json","w"))

def breakdown_workload():
    a = json.load(open("linkStack.json","r", encoding='utf-8') , encoding='utf-8')
    s = list(set([URI_from_http(i[0]) for i in a]))
    s1, s2 = s[:len(s)//2],s[len(s)//2:]
    json.dump(list(filter(lambda x: URI_from_http(x[0]) in s1, a)), open("linkStackI.json", "w", encoding='utf-8'))
    json.dump(list(filter(lambda x: URI_from_http(x[0]) in s2, a)), open("linkStackII.json", "w", encoding='utf-8'))
    
def to_ltc():
    with open("asdasd.json", encoding="utf-8") as f:
        k = json.load(f, encoding="utf-8")
        with open("linksToCrawl.txt", "w", encoding="utf-8") as g:
            g.write("\n".join(["http://"+URI_from_http(j['website']) for j in k]))

to_ltc()
to_linkstack()