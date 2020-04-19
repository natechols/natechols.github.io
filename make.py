#!/usr/bin/env python

import csv

HEADER = """\
<html>
<head>
<title>Bay Area Community Orchestras</title>
<link rel="stylesheet" type="text/css" href="main.css">
</head>

<body bgcolor="black">
<center>
<div class="narrow">
<h4>Bay Area Community Orchestras</h4>
<p>Current as of April 2020, assuming we ever leave our homes again.</p>
"""

with open("orchestras.csv", mode="rt") as csv_in:
	reader = csv.reader(csv_in, delimiter=",")
	header = next(reader)
	orchestras = []
	for row in reader:
		d = {header[i]:cell for i, cell in enumerate(row)}
		orchestras.append(d)
fs = """<p><a href="{url}">{name}<a> ({conductor})</p>\n"""
with open("orchestras.html", mode="wt") as html_out:
	html_out.write(HEADER)
	for o in orchestras:
		html_out.write(fs.format(**o))
	html_out.write("<br/><br/>\n")
	html_out.write("""<p><font class="note">Send omissions/changes to natechols at gmail dot com (or better yet, submit a pull request with changes to the CSV file this is based on).</font><p>\n""")
	html_out.write("\n</body>\n</html>")
