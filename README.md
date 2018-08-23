# js-analyzer

JavaScript utility to analyze source files or directories.

## Current analysis strategies

- **GlobalVariableStrategy** (it will show a report of all global variables in a source file)

## How to use it?

```
    npm install
    npm test
    npm start "C:/svnhead/JavascriptProject/src" > globals_catch.yml
```

## References

- http://tobyho.com/2013/12/02/fun-with-esprima/
- https://github.com/jaz303/find-globals
- https://github.com/jprichardson/node-klaw