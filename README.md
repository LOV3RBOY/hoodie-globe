# 🌎 Hoodie Globe

A stunning 3D globe experience for a hoodie brand. Users send positive messages that travel across the globe and get printed on someone else's hoodie.

![Hoodie Globe Screenshot](https://janarosmonaliev.github.io/github-globe/src/files/github-globe-banner.png)

## ✨ Concept

1. Customer buys a hoodie with a **printed message** from a previous buyer
2. They scan the **QR code** on the tag
3. This opens the **Hoodie Globe** page
4. They type their message and click **Send**
5. Watch it **travel across the globe** via arc animation
6. That message gets **printed on the NEXT hoodie**

> Each hoodie becomes a vessel carrying a stranger's positive note across the world.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000)

## 🛠 Tech Stack

- **Vite** - Lightning-fast bundler
- **Three.js** - 3D rendering
- **three-globe** - Globe visualization
- **Vanilla JS** - No framework overhead

## 🎨 Features

- **3D Globe** with hex polygon landmasses
- **Animated arcs** showing message travel
- **Geolocation** to start arcs from user's location
- **Glassmorphism UI** with sleek input design
- **Real-time stats** tracking messages sent
- **Mobile responsive** design

## 📁 Project Structure

```
hoodie-globe/
├── index.html          # Entry point with UI
├── vite.config.js      # Vite configuration
├── src/
│   ├── index.js        # Main globe + message logic
│   └── files/
│       ├── globe-data-min.json  # Country polygons
│       └── ...
└── package.json
```

## 🔮 Future Enhancements

- [ ] Database integration (Supabase/Firebase)
- [ ] Message queue for print order
- [ ] QR code generation per hoodie
- [ ] Admin panel for message approval
- [ ] Analytics dashboard

## 🙏 Credits

Based on [GitHub Globe](https://github.com/janarosmonaliev/github-globe) by [@janarosmonaliev](https://github.com/janarosmonaliev).

Globe rendering powered by [three-globe](https://github.com/vasturiano/three-globe) by [@vasturiano](https://github.com/vasturiano).

## 📄 License

MIT
