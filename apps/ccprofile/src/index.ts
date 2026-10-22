import run from './cli'
import createContext from './context/createContext'

process.exitCode = await run(process.argv.slice(2), createContext())
