<?php

declare(strict_types=1);

namespace Dandelion\Console\Command;

use Dandelion\Operation\SplitRepositoryInitializerInterface;
use Dandelion\Operation\ReleaserInterface;
use Dandelion\Operation\Result\MessageInterface;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

class SplitRepositoryInitAllCommand extends Command
{
    public const NAME = 'split-repository:init:all';
    public const DESCRIPTION = 'Init all split repository on vcs platform.';

    /**
     * @var \Dandelion\Operation\SplitRepositoryInitializerInterface
     */
    protected $initializer;

    /**
     * @param \Dandelion\Operation\SplitRepositoryInitializerInterface $initializer
     */
    public function __construct(
        SplitRepositoryInitializerInterface $initializer
    ) {
        parent::__construct();
        $this->initializer = $initializer;
    }

    /**
     * @return void
     */
    protected function configure(): void
    {
        parent::configure();

        $this->setName(static::NAME);
        $this->setDescription(static::DESCRIPTION);
    }

    /**
     * @param \Symfony\Component\Console\Input\InputInterface $input
     * @param \Symfony\Component\Console\Output\OutputInterface $output
     *
     * @return int
     */
    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $output->writeln('Init split repositories:');
        $output->writeln('---------------------------------');

        $result = $this->initializer->executeForAllRepositories([]);

        foreach ($result->getMessages() as $message) {
            $symbol = $message->getType() === MessageInterface::TYPE_INFO ? '<fg=green>✔</>' : '<fg=red>✗</>';
            $output->writeln(sprintf('%s %s', $symbol, $message->getText()));
        }

        $output->writeln('---------------------------------');
        $output->writeln('Finished');

        return 0;
    }
}
