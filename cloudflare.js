'use strict';

let axios = require('axios')
let jsdom = require('jsdom')

let pass
let url = process.argv[2]
let sleep = 3
let base = url.split('/')[0] + '//' + url.split('/')[2]
let config = { headers: {
	'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.80 Safari/537.36'
}, params: {} }

axios.get(url, config).catch((res) => {
	if(res.status != 503)
		return false

	config.headers['Cookie'] = res.headers['set-cookie']

	jsdom.env(res.data, parseDom)
})

let parseDom = (err, window) => {
	let form = window.document.querySelector('#challenge-form')

	for(let input of form.querySelectorAll('input'))
		config.params[input.name] = input.value

	config.params['jschl_answer'] = solveJschlChallange(window.document)

	setTimeout(() => { getClearance(base + form.action) }, sleep * 1000)
}

let getClearance = (action) => {
	axios.get(action, config).catch((res) => {
		if(!res.headers['set-cookie'])
			return false

		config.headers['Cookie'].push(res.headers['set-cookie'][0])

		for(let cookie of config.headers['Cookie'])
			console.log(cookie.split(';')[0])

		// finally request the url
		//axios.get(url, config).then((res) => {
		//	console.log(res.data)
		//})
	})
}

let parseCookie = (cookie) => {
	let obj = {}

	for(let part of cookie.split(';')) {
		part = part.trim().split('=')

		obj[part[0]] = part[1]
	}

	return obj
}

let solveJschlChallange = (document) => {
	let match
	let script = document.querySelector('script').innerHTML
	let jschl = /\:([\+\(\)\[\]!]+)/i.exec(script)[1]
	let regex = /[a-z]+\.[a-z]+([\+\-\*\/])=([\+\(\)\[\]!]+);/gi

	// don't try this at home
	while(match = regex.exec(script))
		jschl = eval('(' + jschl + ')' + match[1] + '(' + match[2] + ')')

	jschl = parseInt(jschl, 10) + url.split('/')[2].length

	return jschl
}
