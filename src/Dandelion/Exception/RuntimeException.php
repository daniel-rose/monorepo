<?php

namespace Dandelion\Exception;

use RuntimeException as BaseRuntimeException;

class RuntimeException extends BaseRuntimeException
{

    /**
     * @param string $message
     *
     * @param int|null $code
     */
    public function __construct(?string $message = null, ?int $code = null)
    {
        parent::__construct($message ?? '', $code ?? 0, null);
    }
}