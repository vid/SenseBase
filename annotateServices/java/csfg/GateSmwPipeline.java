package csfg;

import com.google.gson.Gson;

import gate.Annotation;
import gate.AnnotationSet;
import gate.Corpus;
import gate.CorpusController;
import gate.Document;
import gate.Factory;
import gate.Gate;
import gate.creole.ExecutionException;
import gate.creole.ResourceInstantiationException;
import gate.util.GateException;
import gate.util.persistence.PersistenceManager;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileWriter;
import java.io.IOException;
import java.net.MalformedURLException;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Properties;
import java.util.Set;

import org.wikifier.MapList;

public class GateSmwPipeline {
	Gson gson = new Gson();

	private String encoding = null;
	Corpus corpus;
	CorpusController application;
	private String docResult;
	private MapList mapResult;

	static List<String> annotTypesToWrite = null; //new ArrayList<String>();
	{/*
		annotTypesToWrite.add("Enzyme");
		annotTypesToWrite.add("Substrate");
		annotTypesToWrite.add("Fungus");
		annotTypesToWrite.add("Temperature");
		annotTypesToWrite.add("Family");
		annotTypesToWrite.add("Organism");
		annotTypesToWrite.add("AccessionNumber");
		annotTypesToWrite.add("pH");
		//annotTypesToWrite.add("OrganismStats");
		//annotTypesToWrite.add("Glycoside_Hydrolase");
		//annotTypesToWrite.add("BRENDA");
		//annotTypesToWrite.add("NCBI_Taxonomy");
		//annotTypesToWrite.add("SwissProt");
		//annotTypesToWrite.add("SubstrateStats");*/
	}

	public static void main(String[] args) throws GateException, IOException, InterruptedException {
		GateSmwPipeline g = new GateSmwPipeline();
		g.init();
		g.processFile("src/main/config/sample.html");
		String doc = g.getDocResult();
		System.out.println(g.getJSMapResult());
		writeFile(doc, "/tmp/sample.html");
	}
	
	public void init() throws GateException, IOException {
		Properties prop = new Properties();
		File gateHome = null, xgappHome = null;
		 
    	try {
    		prop.load(new FileInputStream("/home/vid/Dropbox/workspace/Proxiris/src/main/config/gatePipeline.properties"));
            gateHome = new File(prop.getProperty("gate.home"));
    		xgappHome = new File(prop.getProperty("xgapp.location"));
    	} catch (IOException ex) {
    		throw ex;
        }
		Gate.setGateHome(gateHome);
		System.out.println("initializing with gate.home " + gateHome + " xgapp.location " + xgappHome + "\n" + System.getProperty("gate.home"));

		Gate.init();
		application = (CorpusController) PersistenceManager.loadObjectFromFile(xgappHome);
		corpus = Factory.newCorpus("BatchProcessApp Corpus");
		application.setCorpus(corpus);
	}
String[] ignore = {}; //{"Token", "Sentence", "SpaceToken", "Document", "NP", "AccessionNumber", "Unknown"};

	public void processFile(String fileName) throws ResourceInstantiationException, ExecutionException, IOException {
		System.out.println("Processing document " + fileName);
		File docFile = new File(fileName);
		Document doc = addAnnotations(docFile);
		String text = doc.getContent().toString();
		mapResult = new MapList();
		Set<Annotation> docAnnos = new HashSet<Annotation>();
		// iterate through desired annotation types, extracting from doc annotations		
		for (String type :  doc.getAnnotations().getAllTypes())  {
			if (type != null) {
				if ((annotTypesToWrite != null && annotTypesToWrite.contains(type))
						|| (annotTypesToWrite == null && !Arrays.asList(ignore).contains(type))) {// (!"Token".equals(type) && !"Sentence".equals(type) && !"SpaceToken".equals(type) && !"Split".equals(type) && !"Document".equals(type) && !"NP".equals(type) && !"AccessionNumber".equals(type)))) {
					
					AnnotationSet as = doc.getAnnotations().get(type);
					for (Annotation a : as) {
						String t = text.substring((int) (long) a.getStartNode().getOffset(), (int) (long) a.getEndNode().getOffset());
						docAnnos.add(a);
						mapResult.put(type, t);
					}
				}
			}
		}
		docResult = doc.toXml(docAnnos, true);
		corpus.remove(doc);
		Factory.deleteResource(doc);
	}

	public String getDocResult() {
		return docResult;
	}
	
	public MapList getMapResult() {
		return mapResult;
	}
	
	public String getJSMapResult() {
		return gson.toJson(mapResult);
	}
	
	Document addAnnotations(File docFile) throws ResourceInstantiationException, MalformedURLException, ExecutionException {
		Document doc = Factory.newDocument(docFile.toURL(), encoding);
		//doc.setPreserveOriginalContent(true);
		doc.setMarkupAware(true);
		corpus.add(doc);
		application.execute();

		corpus.clear();
		return doc;
	}
	
	public void processText(String text) throws ResourceInstantiationException, ExecutionException, IOException {
		File docFile = File.createTempFile("sample", ".html");
		//f.deleteOnExit();
		String tmp = docFile.toString();
		writeFile("<html><body>" +text + "</body></html>", tmp);
		processFile(tmp);
	}
	
	public static void writeFile(String txt, String outfile) throws IOException {
		FileWriter fw = new FileWriter(outfile);
		BufferedWriter out = new BufferedWriter(fw);
		out.write(txt);
		out.close();
	}

}
