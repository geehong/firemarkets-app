
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict, Any
import docker
from pydantic import BaseModel
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter()

class ContainerStatus(BaseModel):
    id: str
    name: str
    status: str
    state: str
    image: str
    created: str
    ports: Dict[str, Any] = {}
    
class ContainerActionResponse(BaseModel):
    success: bool
    message: str
    container_id: str

def get_docker_client():
    try:
        return docker.from_env()
    except Exception as e:
        logger.error(f"Failed to connect to Docker: {e}")
        raise HTTPException(status_code=500, detail="Failed to connect to Docker daemon. Is the socket mounted?")

@router.get("/containers", response_model=List[ContainerStatus])
def list_containers():
    """List all containers"""
    client = get_docker_client()
    containers = []
    try:
        for container in client.containers.list(all=True):
            # Filter for our project containers if desired, but showing all is safer for "docker api" request
            # Maybe filter by name prefix "fire_markets_" or just show all
            
            ports = container.attrs['NetworkSettings']['Ports'] or {}
            
            containers.append(ContainerStatus(
                id=container.short_id,
                name=container.name,
                status=container.status, # running, exited, etc
                state=container.attrs['State']['Status'],
                image=container.image.tags[0] if container.image.tags else container.image.id[:12],
                created=container.attrs['Created'],
                ports=ports
            ))
        return containers
    except Exception as e:
        logger.error(f"Error listing containers: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/containers/{container_id}/start", response_model=ContainerActionResponse)
def start_container(container_id: str):
    """Start a container"""
    client = get_docker_client()
    try:
        container = client.containers.get(container_id)
        container.start()
        return {"success": True, "message": f"Container {container.name} started", "container_id": container_id}
    except Exception as e:
        logger.error(f"Error starting container {container_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/containers/{container_id}/stop", response_model=ContainerActionResponse)
def stop_container(container_id: str):
    """Stop a container"""
    client = get_docker_client()
    try:
        container = client.containers.get(container_id)
        container.stop()
        return {"success": True, "message": f"Container {container.name} stopped", "container_id": container_id}
    except Exception as e:
        logger.error(f"Error stopping container {container_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/containers/{container_id}/restart", response_model=ContainerActionResponse)
def restart_container(container_id: str):
    """Restart a container"""
    client = get_docker_client()
    try:
        container = client.containers.get(container_id)
        container.restart()
        return {"success": True, "message": f"Container {container.name} restarted", "container_id": container_id}
    except Exception as e:
        logger.error(f"Error restarting container {container_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/containers/{container_id}/logs")
def get_container_logs(container_id: str, tail: int = Query(100, ge=1, le=2000)):
    """Get container logs"""
    client = get_docker_client()
    try:
        container = client.containers.get(container_id)
        logs = container.logs(tail=tail, timestamps=True).decode('utf-8')
        return {"logs": logs, "container_id": container_id, "name": container.name}
    except Exception as e:
        logger.error(f"Error getting logs for container {container_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
