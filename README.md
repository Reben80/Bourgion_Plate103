# Bourgoin, Plate 103

A classroom and exhibition explorer for the interlaced rings of Jules Bourgoin’s Plate 103, from _Les Éléments de l’art arabe_ (1879).

The weave is drawn as crisp SVG. Each ring is one filled path. Click a key or a triangle marker to flip that cell on the 6×6 torus, and every periodic copy flips with it. The panel names the symmetry group, shows the tile shapes in the weave, and keeps a short list of challenges.

Pattern after J. Bourgoin, Plate 103 (1879) · Explorer by Dr. Rebin Muhammad.

## Run it

```bash
npm install
npm run dev
```

The dev server listens on port 4178.

```bash
npm test
npm run build
npm run preview
```

`npm run build` typechecks, then writes `dist/`. The site base path is `/` unless `VITE_BASE` is set.

## Deploy

The repository is [Reben80/Bourgion_Plate103](https://github.com/Reben80/Bourgion_Plate103). `.github/workflows/pages.yml` tests the project, builds it with `VITE_BASE` set to `/Bourgion_Plate103/`, and deploys that build to GitHub Pages. With Pages set to deploy from GitHub Actions, the site is at:

https://reben80.github.io/Bourgion_Plate103/

## Credit and license

Pattern after J. Bourgoin, Plate 103 (1879). Explorer by Dr. Rebin Muhammad.

No license has been chosen for this project.
