# Bamboo and TestRail reporter for Mocha
Generates mocha.json and report file for testrail

## Installation

```
npm install git@github.com:minche/mocha-bamboo-testrail-reporter.git
```

## Usage

```
mocha -R mocha-bamboo-testrail-reporter
```

You will then get a neat file `mocha.json` containing specked output in a JSON format for Bamboo to parse, and timestamped json report for TestRail.
