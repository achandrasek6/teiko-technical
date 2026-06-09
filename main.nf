nextflow.enable.dsl=2

process loadData {
    input:
    val ready

    output:
    val true, emit: loaded

    script:
    """
    cd ${projectDir}
    ./venv/bin/python load_data.py
    """
}

process analyzeData {
    input:
    val loaded

    script:
    """
    cd ${projectDir}
    ./venv/bin/python -m src.analysis.run_analysis
    """
}

workflow {
    loadData(true)
    analyzeData(loadData.out.loaded)
}
