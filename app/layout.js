import './globals.css'

export const metadata = {
  title: 'CSP Tournament - Colour Me If You Can',
  description: 'Graph Coloring Challenge - CSP Assignment Leaderboard',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}