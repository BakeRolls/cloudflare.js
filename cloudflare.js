#!/usr/bin/env node

'use strict';

let fs = require('fs')
let axios = require('axios')
let jsdom = require('jsdom')

let url = process.argv[2]
let file =  process.argv[3] || './headers.json'
let sleep = 3
let base = url.split('/')[0] + '//' + url.split('/')[2]
let config = { headers: { 'User-Agent': 'crystal/gems' }, params: {} }

fs.readFile(file, (err, data) => {
	if(!err) config.headers = JSON.parse(data)

	requestFile()
})

let requestFile = () => {
	axios.get(url, config).catch((res) => {
		// TODO: the page itself could send something != 2xx. also throw something/-where else.
		if(res.status != 503) throw 'The page could be broken.'
		if(!res.headers['set-cookie']) throw 'Got no new session cookie. Try deleting ' + file + '.'

		config.headers['Cookie'] = [res.headers['set-cookie'][0].split(';')[0]]

		jsdom.env(res.data, parseDom)
	}).then((res) => {
		console.log(res.data)
	})
}

let parseDom = (err, window) => {
	let form = window.document.querySelector('#challenge-form')

	for(let input of form.querySelectorAll('input'))
		config.params[input.name] = input.value

	config.params['jschl_answer'] = solveJschlChallange(window.document)

	setTimeout(() => { getClearance(base + form.action) }, sleep * 1000)
}

let getClearance = (action) => {
	axios.get(action, config).catch((res) => {
		if(!res.headers['set-cookie']) throw 'Got no auth cookie.'

		config.headers['Cookie'].push(res.headers['set-cookie'][0].split(';')[0])

		fs.writeFile(file, JSON.stringify(config.headers))

		/*
		console.log('curl "' + url + '" \\')

		for(let key in config.headers)
			console.log('-H "' + key + ': ' + ((key == 'Cookie') ? config.headers[key].join('; ') : config.headers[key]) + '" \\')

		console.log('--compressed')
		*/

		requestFile()
	})
}

let solveJschlChallange = (document) => {
	let match
	let script = document.querySelector('script').innerHTML
	let jschl = /\:([\+\(\)\[\]!]+)/.exec(script)[1] // initial value
	let regex = /[a-z]+\.[a-z]+([\+\-\*\/])=([\+\(\)\[\]!]+);/gi // all the other lines

	// don't try this at home
	while(match = regex.exec(script))
		jschl = eval('(' + jschl + ')' + match[1] + '(' + match[2] + ')')

	jschl = + jschl + url.split('/')[2].length

	return jschl
}
