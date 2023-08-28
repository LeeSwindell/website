# Personal Website
## Lee Swindell

### What is this?
My portfolio website

### Running the server
To start the server, run:
```
  npm start
```

To lint, run:
```
  npm run lint
```

### Adding items
The file `scripts/data.js` contains a list of objects, each one representing a different content box. The data is represented like this:

```
  {
    image: <image source>,
    title: <title>,
    time: <year surrounded by square brackets>,
    description: <brief description>,
    link: <link to project>
  }
```

Just add one of these objects to the list to add an item to the site.