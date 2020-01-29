<?php

declare(strict_types=1);

namespace Dandelion\Console\Command;

use Dandelion\Operation\ReleaserInterface;
use InvalidArgumentException;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

use function is_string;

class ReleaseAllCommand extends Command
{
    public const NAME = 'release:all';
    public const DESCRIPTION = 'Release all packages.';

    /**
     * @var \Dandelion\Operation\ReleaserInterface
     */
    protected $releaser;

    /**
     * @param \Dandelion\Operation\ReleaserInterface $releaser
     */
    public function __construct(
        ReleaserInterface $releaser
    ) {
        parent::__construct();
        $this->releaser = $releaser;
    }

    /**
     * @return void
     */
    protected function configure(): void
    {
        parent::configure();

        $this->setName(static::NAME);
        $this->setDescription(static::DESCRIPTION);

        $this->addArgument('branch', InputArgument::REQUIRED, 'Branch');
        $this->addArgument('version', InputArgument::REQUIRED, 'Version');
    }

    /**
     * @param \Symfony\Component\Console\Input\InputInterface $input
     * @param \Symfony\Component\Console\Output\OutputInterface $output
     *
     * @return int|null
     */
    protected function execute(InputInterface $input, OutputInterface $output): ?int
    {
        $branch = $input->getArgument('branch');
        $version = $input->getArgument('version');

        if (!is_string($branch) || !is_string($version)) {
            throw new InvalidArgumentException('Unsupported type for given argument');
        }

        $this->releaser->releaseAll($branch, $version);

        return null;
    }
}