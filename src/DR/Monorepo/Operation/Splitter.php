<?php


namespace DR\Monorepo\Operation;

use DR\Monorepo\Configuration\ConfigurationLoaderInterface;
use DR\Monorepo\Console\Command\SplitCommand;
use DR\Monorepo\Exception\RepositoryNotFoundException;
use DR\Monorepo\Process\ProcessFactory;
use DR\Monorepo\VersionControl\GitInterface;
use DR\Monorepo\VersionControl\SplitshLiteInterface;
use function sprintf;

class Splitter implements SplitterInterface
{
    /**
     * @var \DR\Monorepo\Configuration\ConfigurationLoaderInterface
     */
    protected $configurationLoader;

    /**
     * @var \DR\Monorepo\Process\ProcessFactory
     */
    protected $processFactory;

    /**
     * @var \DR\Monorepo\VersionControl\GitInterface
     */
    protected $git;

    /**
     * @var \DR\Monorepo\VersionControl\SplitshLiteInterface
     */
    protected $splitshLite;

    /**
     * @var string
     */
    protected $binDir;

    /**
     * @param \DR\Monorepo\Configuration\ConfigurationLoaderInterface $configurationLoader
     * @param \DR\Monorepo\Process\ProcessFactory $processFactory
     * @param \DR\Monorepo\VersionControl\GitInterface $git
     * @param \DR\Monorepo\VersionControl\SplitshLiteInterface $splitshLite
     * @param string $binDir
     */
    public function __construct(
        ConfigurationLoaderInterface $configurationLoader,
        ProcessFactory $processFactory,
        GitInterface $git,
        SplitshLiteInterface $splitshLite,
        string $binDir
    ) {
        $this->configurationLoader = $configurationLoader;
        $this->processFactory = $processFactory;
        $this->git = $git;
        $this->splitshLite = $splitshLite;
        $this->binDir = $binDir;
    }

    /**
     * @param string $repositoryName
     * @param string $branch
     *
     * @return \DR\Monorepo\Operation\SplitterInterface
     *
     * @throws \Exception
     */
    public function split(string $repositoryName, string $branch): SplitterInterface
    {
        $configuration = $this->configurationLoader->load();
        $repositories = $configuration->getRepositories();

        if (!$repositories->offsetExists($repositoryName)) {
            throw new RepositoryNotFoundException(\sprintf('Could not find repository "%s".', $repositoryName));
        }

        $repository = $repositories->offsetGet($repositoryName);

        $this->git->addRemote($repositoryName, $repository->getUrl());
        $sha1 = $this->splitshLite->getSha1($repository->getPath());
        $refSpec = sprintf('%s:refs/heads/%s', $sha1, $branch);
        $this->git->push($repositoryName, $refSpec, false, true);

        return $this;
    }

    /**
     * @param string $branch
     *
     * @return \DR\Monorepo\Operation\SplitterInterface
     */
    public function splitAll(string $branch = 'master'): SplitterInterface
    {
        $configuration = $this->configurationLoader->load();

        foreach ($configuration->getRepositories() as $repositoryName => $repository) {
            $this->splitAsProcess($repositoryName, $branch);
        }

        return $this;
    }

    /**
     * @param string $repositoryName
     * @param string $branch
     *
     * @return \DR\Monorepo\Operation\SplitterInterface
     */
    protected function splitAsProcess(
        string $repositoryName,
        string $branch
    ): SplitterInterface {
        $command = $command = [
            sprintf('%smonorepo', $this->binDir),
            SplitCommand::NAME,
            $repositoryName,
            $branch
        ];

        $process = $this->processFactory->create($command);

        $process->start();

        return $this;
    }
}