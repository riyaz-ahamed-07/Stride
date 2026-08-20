from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from fastapi import WebSocket


@dataclass
class Peer:
    id: str
    name: str
    role: str
    socket: WebSocket


class Room:
    def __init__(self, room_id: str) -> None:
        self.room_id = room_id
        self.peers: dict[str, Peer] = {}

    def snapshot(self, exclude: str | None = None) -> list[dict[str, str]]:
        return [
            {"id": peer.id, "name": peer.name, "role": peer.role}
            for peer in self.peers.values()
            if peer.id != exclude
        ]

    async def send(self, peer_id: str, message: dict[str, Any]) -> None:
        peer = self.peers.get(peer_id)
        if not peer:
            return
        await peer.socket.send_text(json.dumps(message))

    async def broadcast(self, message: dict[str, Any], exclude: str | None = None) -> None:
        dead: list[str] = []
        for peer_id, peer in self.peers.items():
            if peer_id == exclude:
                continue
            try:
                await peer.socket.send_text(json.dumps(message))
            except Exception:
                dead.append(peer_id)
        for peer_id in dead:
            self.peers.pop(peer_id, None)


_rooms: dict[str, Room] = {}


def get_room(room_id: str) -> Room:
    if room_id not in _rooms:
        _rooms[room_id] = Room(room_id)
    return _rooms[room_id]


async def disconnect_peer(room_id: str, peer_id: str) -> None:
    room = _rooms.get(room_id)
    if not room or peer_id not in room.peers:
        return
    room.peers.pop(peer_id)
    await room.broadcast({"type": "peer-left", "id": peer_id})
    if not room.peers:
        _rooms.pop(room_id, None)


def list_rooms() -> list[dict[str, object]]:
    return [
        {
            "room_id": room_id,
            "peers": [{"id": p.id, "name": p.name, "role": p.role} for p in room.peers.values()],
        }
        for room_id, room in _rooms.items()
    ]
