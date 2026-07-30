from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from src.core.exceptions import BizException
from src.modules.tool.schema import (
    ToolStatus,
    ToolTestRequest,
    ToolTestResponse,
    ToolUpdate,
)
from src.modules.tool.service import ToolService


def build_tool(
    *,
    tool_id: int = 7,
    name: str = "weather",
    status: str = "disabled",
) -> SimpleNamespace:
    return SimpleNamespace(
        id=tool_id,
        name=name,
        description=None,
        type="http_api",
        status=status,
        config={"url": "https://example.com/weather"},
        function_definition=None,
        call_count_7d=0,
        success_rate=Decimal("0.00"),
        avg_latency=0,
        created_by="admin",
    )


def build_service() -> tuple[ToolService, AsyncMock]:
    tester = AsyncMock()
    service = ToolService(
        AsyncMock(),
        execution_tester=tester,
    )
    service.repo = AsyncMock()
    return service, tester


@pytest.mark.asyncio
async def test_delete_tool_deletes_loaded_entity() -> None:
    service, _ = build_service()
    tool = build_tool()
    service.repo.get_by_id.return_value = tool

    await service.delete_tool(tool_id=tool.id)

    service.repo.delete.assert_awaited_once_with(tool)


@pytest.mark.asyncio
async def test_failed_test_moves_enabled_tool_to_error() -> None:
    service, tester = build_service()
    tool = build_tool(status=ToolStatus.ENABLED.value)
    service.repo.get_by_id.return_value = tool
    service.repo.update.side_effect = lambda value: value
    tester.test.return_value = ToolTestResponse(
        success=False,
        error="无法连接到工具",
        latency_ms=5,
    )

    result = await service.test_tool(
        tool_id=tool.id,
        data=ToolTestRequest(input={"city": "Shanghai"}),
    )

    assert result.success is False
    assert tool.status == ToolStatus.ERROR.value
    service.repo.update.assert_awaited_once_with(tool)


@pytest.mark.asyncio
async def test_failed_test_does_not_change_disabled_tool_state() -> None:
    service, tester = build_service()
    tool = build_tool(status=ToolStatus.DISABLED.value)
    service.repo.get_by_id.return_value = tool
    tester.test.return_value = ToolTestResponse(
        success=False,
        error="无法连接到工具",
    )

    await service.test_tool(
        tool_id=tool.id,
        data=ToolTestRequest(input={}),
    )

    assert tool.status == ToolStatus.DISABLED.value
    service.repo.update.assert_not_awaited()


@pytest.mark.asyncio
async def test_error_tool_can_be_enabled_or_disabled() -> None:
    service, _ = build_service()
    tool = build_tool(status=ToolStatus.ERROR.value)
    service.repo.get_by_id.return_value = tool
    service.repo.update.side_effect = lambda value: value

    enabled = await service.enable_tool(tool_id=tool.id)

    assert enabled.status is ToolStatus.ENABLED
    tool.status = ToolStatus.ERROR.value

    disabled = await service.disable_tool(tool_id=tool.id)

    assert disabled.status is ToolStatus.DISABLED


@pytest.mark.asyncio
async def test_update_tool_rejects_duplicate_name() -> None:
    service, _ = build_service()
    tool = build_tool(tool_id=7, name="weather")
    duplicate = build_tool(tool_id=8, name="search")
    service.repo.get_by_id.return_value = tool
    service.repo.get_by_name.return_value = duplicate

    with pytest.raises(BizException) as exc_info:
        await service.update_tool(
            tool_id=tool.id,
            data=ToolUpdate(name="search"),
        )

    assert exc_info.value.code == 44001
    service.repo.update.assert_not_awaited()
