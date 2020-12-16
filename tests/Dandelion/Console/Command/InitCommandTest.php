<?php

declare(strict_types=1);

namespace Dandelion\Console\Command;

use Codeception\Test\Unit;
use Dandelion\Operation\InitializerInterface;
use Exception;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

class InitCommandTest extends Unit
{
    /**
     * @var \PHPUnit\Framework\MockObject\MockObject|\Symfony\Component\Console\Input\InputInterface
     */
    protected $inputMock;

    /**
     * @var \PHPUnit\Framework\MockObject\MockObject|\Symfony\Component\Console\Output\OutputInterface
     */
    protected $outputMock;

    /**
     * @var \PHPUnit\Framework\MockObject\MockObject|\Dandelion\Operation\InitializerInterface
     */
    protected $initializerMock;

    /**
     * @var \Dandelion\Console\Command\InitCommand
     */
    protected $initCommand;

    /**
     * @return void
     */
    protected function _before(): void
    {
        parent::_before();

        $this->inputMock = $this->getMockBuilder(InputInterface::class)
            ->disableOriginalConstructor()
            ->getMock();

        $this->outputMock = $this->getMockBuilder(OutputInterface::class)
            ->disableOriginalConstructor()
            ->getMock();

        $this->initializerMock = $this->getMockBuilder(InitializerInterface::class)
            ->disableOriginalConstructor()
            ->getMock();

        $this->initCommand = new InitCommand($this->initializerMock);
    }

    /**
     * @return void
     */
    public function testGetName(): void
    {
        static::assertEquals(InitCommand::NAME, $this->initCommand->getName());
    }

    /**
     * @return void
     */
    public function testGetDescription(): void
    {
        static::assertEquals(InitCommand::DESCRIPTION, $this->initCommand->getDescription());
    }

    /**
     * @return void
     *
     * @throws \Exception
     */
    public function testRun(): void
    {
        $repositoryName = 'package';

        $this->inputMock->expects(static::atLeastOnce())
            ->method('getArgument')
            ->withConsecutive(['repositoryName'])
            ->willReturnOnConsecutiveCalls($repositoryName);

        $this->initializerMock->expects(static::atLeastOnce())
            ->method('executeForSingleRepository')
            ->with($repositoryName);

        static::assertEquals(0, $this->initCommand->run($this->inputMock, $this->outputMock));
    }

    /**
     * @return void
     *
     * @throws \Exception
     */
    public function testRunWithInvalidArgument(): void
    {
        $repositoryName = 1;

        $this->inputMock->expects(static::atLeastOnce())
            ->method('getArgument')
            ->withConsecutive(['repositoryName'])
            ->willReturnOnConsecutiveCalls($repositoryName);

        $this->initializerMock->expects(static::never())
            ->method('executeForSingleRepository');

        try {
            $this->initCommand->run($this->inputMock, $this->outputMock);
        } catch (Exception $e) {
            return;
        }

        static::fail();
    }
}
