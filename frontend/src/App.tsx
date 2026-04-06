import { useState } from 'react'
import Lobby from './components/Lobby'
import Whiteboard from './components/Whiteboard'

function App() {
  const [inRoom, setInRoom] = useState(false)
  const [roomId, setRoomId] = useState('')
  const [username, setUsername] = useState('')

  const handleJoin = (roomId: string, username: string) => {
    setRoomId(roomId)
    setUsername(username)
    setInRoom(true)
  }

  const handleLeave = () => {
    setInRoom(false)
    setRoomId('')
    setUsername('')
  }

  return (
    <div className="w-full h-full flex flex-col font-sans">
      <div className="flex-1 w-full h-full relative overflow-hidden">
        {inRoom ? (
          <Whiteboard roomId={roomId} username={username} onLeave={handleLeave} />
        ) : (
          <Lobby onJoin={handleJoin} />
        )}
      </div>
    </div>
  )
}

export default App
